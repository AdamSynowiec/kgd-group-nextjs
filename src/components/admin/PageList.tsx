"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminApiError, createPage, deletePage, fetchPageLocks, type PageLockHolder, type PageSummary, type Session } from "@/lib/adminApi";
import { PAGE_TEMPLATES, getPageTemplate } from "@/lib/pageTemplates";
import { slugify } from "@/lib/slugify";
import { can } from "@/lib/permissions";
import Can from "@/components/admin/Can";
import { ChevronDownIcon, CloseIcon, FileIcon, FolderIcon, PlusIcon, SearchIcon, TrashIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";

const COLLAPSED_SECTIONS_KEY = "admin-pages-collapsed-sections";

type StatusFilter = "all" | "draft" | "published";

/**
 * Sekcja wyliczana z pierwszego segmentu adresu — wyłącznie do grupowania
 * widoku, nie ma odpowiednika w danych. Kolejność też stąd (SECTION_ORDER).
 */
function sectionOf(slug: string): { key: string; label: string } {
  if (slug === "/") return { key: "home", label: "Strona główna" };
  const first = slug.split("/").filter(Boolean)[0] ?? "";
  if (first === "blog") return { key: "blog", label: "Blog" };
  if (first === "inwestycja" || first === "inwestycje") return { key: "inwestycje", label: "Inwestycje" };
  if (first === "kgd-building") return { key: "kgd-building", label: "KGD Building" };
  return { key: "inne", label: "Inne strony" };
}

const SECTION_ORDER = ["home", "inwestycje", "kgd-building", "blog", "inne"];

type PageNode = PageSummary & { children: PageNode[] };

/**
 * Drzewo z pola "parent" (prawdziwy slug strony-rodzica, patrz
 * backend/src/Repository/MysqlPageRepository.php) — np. "historia cen"
 * inwestycji ma parent = slug jej strony głównej. Strona, której parent
 * jest pusty/"/"/nieznaleziony w tym zbiorze (np. odfiltrowany wyszukiwaniem),
 * ląduje jako korzeń — więc wynik filtrowania nigdy nie "gubi" wiersza.
 */
function buildTree(pages: PageSummary[]): PageNode[] {
  const bySlug = new Map<string, PageNode>(pages.map((page) => [page.slug, { ...page, children: [] }]));
  const roots: PageNode[] = [];
  for (const node of bySlug.values()) {
    const parent = node.parent && node.parent !== "/" ? bySlug.get(node.parent) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function countTree(nodes: PageNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countTree(node.children), 0);
}

function flattenTree(nodes: PageNode[], depth = 0): { page: PageSummary; depth: number }[] {
  const out: { page: PageSummary; depth: number }[] = [];
  for (const node of nodes) {
    out.push({ page: node, depth });
    out.push(...flattenTree(node.children, depth + 1));
  }
  return out;
}

function loadCollapsedSections(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveCollapsedSections(collapsed: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsed]));
  } catch {
    // localStorage niedostępny (np. prywatne okno) — stan po prostu nie przetrwa odświeżenia.
  }
}

/**
 * Lista + tworzenie + usuwanie stron — wzorowane na dawnym CollectionList.tsx
 * (jedyne wcześniej miejsce w panelu z prawdziwym tworzeniem/usuwaniem).
 * `pages` (dawniej tylko do odczytu, patrz db/schema.sql) dostało create/delete
 * razem z przeniesieniem bloga tutaj — każda strona (w tym wpisy bloga) jest
 * teraz zwykłym wierszem na tej liście.
 *
 * Przy dużej liczbie stron płaska lista była nieczytelna, więc widok grupuje
 * strony w sekcje (po pierwszym segmencie adresu) i zagnieżdża dzieci pod
 * rodzicem wg "parent" — plus wyszukiwanie i filtr statusu, które spłaszczają
 * wynik (hierarchia nie pomaga, gdy już przefiltrowano do kilku trafień).
 */
export default function PageList({
  initialPages,
  session,
  onEdit,
}: {
  initialPages: PageSummary[];
  session: Session | null;
  onEdit: (slug: string) => void;
}) {
  const [pages, setPages] = useState(initialPages);
  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => loadCollapsedSections());
  // Kto teraz edytuje którą stronę (blokady edycji) — odświeżane co 20 s.
  const [locks, setLocks] = useState<Map<string, PageLockHolder>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchPageLocks(session)
        .then((items) => !cancelled && setLocks(new Map(items.map((item) => [item.slug, item]))))
        .catch(() => undefined); // blokady to tylko podpowiedź — brak tabeli/błąd nie psuje listy
    void load();
    const timer = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session]);

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCollapsedSections(next);
      return next;
    });
  }

  const normalizedSearch = search.trim().toLowerCase();
  const isSearching = normalizedSearch !== "";

  const filtered = useMemo(
    () =>
      pages.filter((page) => {
        if (statusFilter !== "all" && page.status !== statusFilter) return false;
        if (normalizedSearch === "") return true;
        return page.title.toLowerCase().includes(normalizedSearch) || page.slug.toLowerCase().includes(normalizedSearch);
      }),
    [pages, statusFilter, normalizedSearch]
  );

  const sections = useMemo(() => {
    if (isSearching) return null;

    const roots = buildTree(filtered);
    const byKey = new Map<string, { label: string; items: PageNode[] }>();
    for (const root of roots) {
      const { key, label } = sectionOf(root.slug);
      if (!byKey.has(key)) byKey.set(key, { label, items: [] });
      byKey.get(key)!.items.push(root);
    }

    const orderedKeys = [...SECTION_ORDER.filter((key) => byKey.has(key)), ...[...byKey.keys()].filter((key) => !SECTION_ORDER.includes(key))];
    return orderedKeys.map((key) => ({ key, ...byKey.get(key)! }));
  }, [filtered, isSearching]);

  const publishedCount = pages.filter((page) => page.status === "published").length;
  const draftCount = pages.length - publishedCount;
  const removePage = (slug: string) => setPages((prev) => prev.filter((p) => p.slug !== slug));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Strony</h2>
          <p className="mt-1 text-sm text-zinc-500">Wszystkie podstrony serwisu, inwestycje i wpisy bloga w jednym miejscu.</p>
        </div>
        <Can session={session} permission="pages.create">
          <button onClick={() => setShowNewPageForm(true)} className={ui.btnPrimary}>
            <PlusIcon className="h-4 w-4" />
            Nowa strona
          </button>
        </Can>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        <StatCard label="Wszystkie" value={pages.length} />
        <StatCard label="Opublikowane" value={publishedCount} dot="bg-emerald-500" />
        <StatCard label="Szkice" value={draftCount} dot="bg-amber-400" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj po tytule lub adresie…" className={`${ui.input} pl-9`} />
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200/60" role="tablist" aria-label="Filtr statusu">
            <StatusFilterButton label="Wszystkie" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
            <StatusFilterButton label="Opublikowane" active={statusFilter === "published"} onClick={() => setStatusFilter("published")} />
            <StatusFilterButton label="Szkice" active={statusFilter === "draft"} onClick={() => setStatusFilter("draft")} />
          </div>
          <span className="hidden shrink-0 text-xs tabular-nums text-zinc-500 sm:inline">
            {filtered.length} z {pages.length}
          </span>
        </div>
      </div>

      {isSearching ? (
        <div className={`${ui.card} overflow-hidden`}>
          <PageRows items={filtered.map((page) => ({ page, depth: 0 }))} session={session} locks={locks} onEdit={onEdit} onDeleted={removePage} />
        </div>
      ) : (
        <div className="space-y-4">
          {(sections ?? []).map((section) => {
            const collapsed = collapsedSections.has(section.key);
            return (
              <section key={section.key} className={`${ui.card} overflow-hidden`}>
                <button onClick={() => toggleSection(section.key)} aria-expanded={!collapsed} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-zinc-50/80">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200/60">
                    <FolderIcon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-zinc-900">{section.label}</span>
                  <span className={`${ui.badge} ${ui.badgeNeutral} tabular-nums`}>{countTree(section.items)}</span>
                  <ChevronDownIcon className={`ml-auto h-4 w-4 shrink-0 text-zinc-400 transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                </button>
                {!collapsed && (
                  <div className="border-t border-zinc-100">
                    <PageRows items={flattenTree(section.items)} session={session} locks={locks} onEdit={onEdit} onDeleted={removePage} />
                  </div>
                )}
              </section>
            );
          })}
          {(sections ?? []).length === 0 && <EmptyState />}
        </div>
      )}

      {showNewPageForm && (
        <Can session={session} permission="pages.create">
          <NewPageForm
            session={session}
            onCancel={() => setShowNewPageForm(false)}
            onCreated={(slug, title) => {
              setPages((prev) => [{ slug, title, status: "draft", parent: null, updatedAt: new Date().toISOString() }, ...prev]);
              setShowNewPageForm(false);
              onEdit(slug);
            }}
          />
        </Can>
      )}
    </div>
  );
}

function StatCard({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className={`${ui.card} px-4 py-3`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-900">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={`${ui.card} flex flex-col items-center px-6 py-14 text-center`}>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-zinc-400">
        <SearchIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-900">Brak stron spełniających filtr</p>
      <p className="mt-1 text-sm text-zinc-500">Zmień wyszukiwaną frazę albo filtr statusu.</p>
    </div>
  );
}

function StatusFilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${active ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-zinc-200/80" : "text-zinc-500 hover:text-zinc-900"}`}
    >
      {label}
    </button>
  );
}

function NewPageForm({
  session,
  onCreated,
  onCancel,
}: {
  session: Session | null;
  onCreated: (slug: string, title: string) => void;
  onCancel: () => void;
}) {
  const [templateKey, setTemplateKey] = useState("blank");
  const [title, setTitle] = useState("");
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const template = getPageTemplate(templateKey);
  const slug = slugOverride ?? (title.trim() === "" ? "" : template.defaultSlug(slugify(title)));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !submitting && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (slug === "") return;

    setSubmitting(true);
    setErrorMessage("");
    try {
      const created = await createPage(slug, template.blankContent(title, slug), session);
      onCreated(created.slug, title);
      setTitle("");
      setSlugOverride(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-4 py-16 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="new-page-title">
      <div className="absolute inset-0" onClick={() => !submitting && onCancel()} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg rounded-2xl border border-zinc-200/80 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 id="new-page-title" className="text-base font-semibold text-zinc-900">
              Nowa strona
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">Wybierz szablon i podaj tytuł — adres uzupełni się sam.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Zamknij" className={ui.iconBtn}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {errorMessage && <p className={ui.alertError}>{errorMessage}</p>}

          <div>
            <label htmlFor="new-page-template" className={ui.label}>
              Szablon
            </label>
            <select
              id="new-page-template"
              value={templateKey}
              onChange={(event) => {
                setTemplateKey(event.target.value);
                setSlugOverride(null);
              }}
              disabled={submitting}
              className={ui.input}
            >
              {Object.values(PAGE_TEMPLATES).map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-page-title-input" className={ui.label}>
              Tytuł
            </label>
            <input id="new-page-title-input" value={title} onChange={(event) => setTitle(event.target.value)} disabled={submitting} autoFocus placeholder="np. Nowa inwestycja" className={ui.input} />
          </div>
          <div>
            <label htmlFor="new-page-slug" className={ui.label}>
              Adres (slug)
            </label>
            <input
              id="new-page-slug"
              value={slug}
              onChange={(event) => setSlugOverride(event.target.value.startsWith("/") ? event.target.value : `/${event.target.value}`)}
              disabled={submitting}
              placeholder="/adres-strony"
              className={`${ui.input} font-mono text-[13px]`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
          <button type="button" onClick={onCancel} disabled={submitting} className={ui.btnSecondary}>
            Anuluj
          </button>
          <button type="submit" disabled={submitting || title.trim() === "" || slug === ""} className={ui.btnPrimary}>
            {submitting ? "Tworzenie..." : "Utwórz stronę"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** "2026-10-11" / ISO -> "11 paź 2026" (czytelna data ostatniej zmiany). */
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

function PageRows({
  items,
  session,
  locks,
  onEdit,
  onDeleted,
}: {
  items: { page: PageSummary; depth: number }[];
  session: Session | null;
  locks: Map<string, PageLockHolder>;
  onEdit: (slug: string) => void;
  onDeleted: (slug: string) => void;
}) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const canDelete = can(session?.permissions, "pages.delete");

  async function handleDelete(page: PageSummary) {
    if (!window.confirm(`Usunąć "${page.title}" (${page.slug})? Tej operacji nie da się cofnąć.`)) {
      return;
    }

    setPendingSlug(page.slug);
    setErrorMessage("");
    try {
      await deletePage(page.slug, session);
      onDeleted(page.slug);
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.";
      setErrorMessage(message);
    } finally {
      setPendingSlug(null);
    }
  }

  if (items.length === 0) {
    return <p className="px-5 py-6 text-sm text-zinc-500">Brak stron.</p>;
  }

  return (
    <>
      {errorMessage && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</p>}
      <ul className="divide-y divide-zinc-100">
        {items.map(({ page, depth }) => (
          <li key={page.slug} className="group relative flex items-center gap-4 py-3 pr-4 transition hover:bg-zinc-50/80" style={{ paddingLeft: `${20 + depth * 28}px` }}>
            {depth > 0 && <span aria-hidden className="absolute top-0 h-1/2 w-3 rounded-bl-md border-b border-l border-zinc-200" style={{ left: `${20 + (depth - 1) * 28 + 10}px` }} />}
            <button onClick={() => onEdit(page.slug)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200/80 bg-white text-zinc-400 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition group-hover:text-indigo-500">
                <FileIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-700">{page.title}</span>
                  {locks.has(page.slug) && (
                    <span className={`${ui.badge} shrink-0 bg-orange-50 text-orange-700 ring-orange-600/15`} title="Strona jest teraz otwarta w edytorze">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
                      {locks.get(page.slug)!.sameUser ? "otwarta u Ciebie" : `edytuje ${locks.get(page.slug)!.login}`}
                    </span>
                  )}
                  {page.status === "draft" ? (
                    <span className={`${ui.badge} ${ui.badgeWarning} shrink-0`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Szkic
                    </span>
                  ) : (
                    <span className={`${ui.badge} ${ui.badgeSuccess} hidden shrink-0 sm:inline-flex`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Opublikowana
                    </span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="truncate font-mono text-[11px]">{page.slug}</span>
                  <span className="hidden text-zinc-300 sm:inline">•</span>
                  <span className="hidden shrink-0 sm:inline">zmieniono {formatDate(page.updatedAt)}</span>
                </span>
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => onEdit(page.slug)} className={ui.btnSecondarySm}>
                Edytuj
              </button>
              {canDelete && (
                <button
                  onClick={() => handleDelete(page)}
                  disabled={pendingSlug === page.slug}
                  title="Usuń stronę"
                  aria-label={`Usuń ${page.title}`}
                  className={`${ui.iconBtn} hover:bg-red-50 hover:text-red-600`}
                >
                  {pendingSlug === page.slug ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-200 border-t-red-500" /> : <TrashIcon className="h-4 w-4" />}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
