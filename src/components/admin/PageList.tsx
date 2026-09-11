"use client";

import { useState } from "react";
import { AdminApiError, createPage, deletePage, type PageSummary, type Session } from "@/lib/adminApi";
import { PAGE_TEMPLATES, getPageTemplate } from "@/lib/pageTemplates";
import { slugify } from "@/lib/slugify";
import { can } from "@/lib/permissions";
import Can from "@/components/admin/Can";

const inputClass = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Lista + tworzenie + usuwanie stron — wzorowane na dawnym CollectionList.tsx
 * (jedyne wcześniej miejsce w panelu z prawdziwym tworzeniem/usuwaniem).
 * `pages` (dawniej tylko do odczytu, patrz db/schema.sql) dostało create/delete
 * razem z przeniesieniem bloga tutaj — każda strona (w tym wpisy bloga) jest
 * teraz zwykłym wierszem na tej liście.
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

  return (
    <div className="space-y-6">
      <Can session={session} permission="pages.create">
        <NewPageForm
          session={session}
          onCreated={(slug, title) => {
            setPages((prev) => [{ slug, title, status: "draft", parent: null, updatedAt: new Date().toISOString() }, ...prev]);
            onEdit(slug);
          }}
        />
      </Can>
      <PageRows pages={pages} session={session} onEdit={onEdit} onDeleted={(slug) => setPages((prev) => prev.filter((p) => p.slug !== slug))} />
    </div>
  );
}

function NewPageForm({ session, onCreated }: { session: Session | null; onCreated: (slug: string, title: string) => void }) {
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
      <h2 className="text-sm font-semibold text-zinc-900">Nowa strona</h2>

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
  pages,
  session,
  onEdit,
  onDeleted,
}: {
  pages: PageSummary[];
  session: Session | null;
  onEdit: (slug: string) => void;
  onDeleted: (slug: string) => void;
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

  if (pages.length === 0) {
    return <p className="text-sm text-zinc-500">Brak stron.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {errorMessage && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</p>}
      <ul className="divide-y divide-zinc-100">
        {pages.map((page) => (
          <li key={page.slug} className="flex items-center justify-between gap-4 px-5 py-4">
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
    </div>
  );
}
