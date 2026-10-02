"use client";

import { useMemo, useState } from "react";
import { AdminApiError, createPage, deletePage, type PageSummary, type Session } from "@/lib/adminApi";
import { PAGE_TEMPLATES, getPageTemplate } from "@/lib/pageTemplates";
import { slugify } from "@/lib/slugify";
import { can } from "@/lib/permissions";
import Can from "@/components/admin/Can";
import { ChevronDownIcon, FolderIcon, SearchIcon } from "@/components/admin/icons";

const inputClass = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

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
  const [showNewPageForm, setShowNewPageForm] = useState(initialPages.length === 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => loadCollapsedSections());

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

  return (
    <div className="space-y-6">
      <Can session={session} permission="pages.create">
        {showNewPageForm ? (
          <NewPageForm
            session={session}
            onCancel={() => setShowNewPageForm(false)}
            onCreated={(slug, title) => {
              setPages((prev) => [{ slug, title, status: "draft", parent: null, updatedAt: new Date().toISOString() }, ...prev]);
              onEdit(slug);
            }}
          />
        ) : (
          <button
            onClick={() => setShowNewPageForm(true)}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838]"
          >
            + Nowa strona
          </button>
        )}
      </Can>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Szukaj po tytule lub adresie..."
            className={`${inputClass} pl-9`}
          />
        </div>

        <div className="flex items-center gap-2">
          <StatusFilterButton label="Wszystkie" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <StatusFilterButton label="Opublikowane" active={statusFilter === "published"} onClick={() => setStatusFilter("published")} />
          <StatusFilterButton label="Szkice" active={statusFilter === "draft"} onClick={() => setStatusFilter("draft")} />
          <span className="shrink-0 text-sm text-zinc-500">
            {filtered.length} z {pages.length}
          </span>
        </div>
      </div>

      {isSearching ? (
        <PageRows items={filtered.map((page) => ({ page, depth: 0 }))} session={session} onEdit={onEdit} onDeleted={(slug) => setPages((prev) => prev.filter((p) => p.slug !== slug))} />
      ) : (
        <div className="space-y-4">
          {(sections ?? []).map((section) => (
            <div key={section.key} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <button
                onClick={() => toggleSection(section.key)}
                className="flex w-full items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-left transition-colors hover:bg-zinc-100"
              >
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${collapsedSections.has(section.key) ? "-rotate-90" : ""}`}
                />
                <FolderIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="text-sm font-semibold text-zinc-900">{section.label}</span>
                <span className="text-sm text-zinc-400">{countTree(section.items)}</span>
              </button>
              {!collapsedSections.has(section.key) && (
                <PageRows
                  items={flattenTree(section.items)}
                  session={session}
                  onEdit={onEdit}
                  onDeleted={(slug) => setPages((prev) => prev.filter((p) => p.slug !== slug))}
                  bare
                />
              )}
            </div>
          ))}
          {(sections ?? []).length === 0 && <p className="text-sm text-zinc-500">Brak stron spełniających filtr.</p>}
        </div>
      )}
    </div>
  );
}

function StatusFilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          : "rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
      }
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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Nowa strona</h2>
        <button type="button" onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-900">
          Zwiń
        </button>
      </div>

      {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Szablon</label>
          <select
            value={templateKey}
            onChange={(event) => {
              setTemplateKey(event.target.value);
              setSlugOverride(null);
            }}
            disabled={submitting}
            className={inputClass}
          >
            {Object.values(PAGE_TEMPLATES).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tytuł</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={submitting} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Adres (slug)</label>
          <input
            value={slug}
            onChange={(event) => setSlugOverride(event.target.value.startsWith("/") ? event.target.value : `/${event.target.value}`)}
            disabled={submitting}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || title.trim() === "" || slug === ""}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50"
      >
        {submitting ? "Tworzenie..." : "Dodaj stronę"}
      </button>
    </form>
  );
}

function PageRows({
  items,
  session,
  onEdit,
  onDeleted,
  bare = false,
}: {
  items: { page: PageSummary; depth: number }[];
  session: Session | null;
  onEdit: (slug: string) => void;
  onDeleted: (slug: string) => void;
  /** true w sekcjach grupowanego widoku — bez własnej ramki, bo ją ma już rodzic (nagłówek sekcji). */
  bare?: boolean;
}) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

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
    return bare ? null : <p className="text-sm text-zinc-500">Brak stron.</p>;
  }

  const list = (
    <ul className="divide-y divide-zinc-100">
      {items.map(({ page, depth }) => (
        <li key={page.slug} className="flex items-center justify-between gap-4 py-4 pr-5" style={{ paddingLeft: `${20 + depth * 24}px` }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-zinc-900">{page.title}</span>
              {page.status === "draft" && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">szkic</span>
              )}
            </div>
            <div className="truncate text-sm text-zinc-500">
              {page.slug} · ostatnia zmiana: {page.updatedAt}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => onEdit(page.slug)}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50"
            >
              Edytuj
            </button>
            {can(session?.permissions, "pages.delete") && (
              <button
                onClick={() => handleDelete(page)}
                disabled={pendingSlug === page.slug}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
              >
                {pendingSlug === page.slug ? "Usuwanie..." : "Usuń"}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  if (bare) {
    return (
      <>
        {errorMessage && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</p>}
        {list}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {errorMessage && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</p>}
      {list}
    </div>
  );
}
