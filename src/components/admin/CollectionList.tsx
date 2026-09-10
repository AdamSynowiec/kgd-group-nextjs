"use client";

import { useState } from "react";
import {
  AdminApiError,
  createCollectionItem,
  deleteCollectionItem,
  type CollectionItem,
  type CollectionItemSummary,
  type Session,
} from "@/lib/adminApi";
import type { CollectionDefinition } from "@/lib/collections/registry";
import { slugify } from "@/lib/slugify";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Lista + tworzenie + usuwanie elementów JEDNEJ kolekcji — wzorowane wprost
 * na UsersPanel.tsx (jedyne dotąd miejsce w panelu z prawdziwym
 * tworzeniem/usuwaniem). Edycja (potrzebująca pełnej treści, nie tylko
 * podsumowania) zostaje w rodzicu — patrz src/app/admin/blog/page.tsx,
 * ten sam podział co PageList.tsx/PageEditor.tsx dla stron.
 */
export default function CollectionList({
  collection,
  initialItems,
  session,
  onEdit,
}: {
  collection: CollectionDefinition;
  initialItems: CollectionItemSummary[];
  session: Session | null;
  onEdit: (slug: string) => void;
}) {
  const [items, setItems] = useState(initialItems);

  return (
    <div className="space-y-6">
      <NewItemForm
        collection={collection}
        session={session}
        onCreated={(item) => {
          setItems((prev) => [
            { slug: item.slug, title: titleOf(item), status: item.status, publishedAt: item.publishedAt, updatedAt: item.updatedAt },
            ...prev,
          ]);
          onEdit(item.slug);
        }}
      />
      <ItemList
        collection={collection}
        items={items}
        session={session}
        onEdit={onEdit}
        onDeleted={(slug) => setItems((prev) => prev.filter((item) => item.slug !== slug))}
      />
    </div>
  );
}

function titleOf(item: CollectionItem): string {
  const titleField = item.content.title;
  if (titleField && typeof titleField === "object" && "value" in titleField) {
    const value = (titleField as { value: unknown }).value;
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return item.slug;
}

function NewItemForm({
  collection,
  session,
  onCreated,
}: {
  collection: CollectionDefinition;
  session: Session | null;
  onCreated: (item: CollectionItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const slug = slugOverride ?? slugify(title);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (slug === "") return;

    setSubmitting(true);
    setErrorMessage("");
    try {
      const created = await createCollectionItem(collection.key, slug, collection.blankContent(title), session);
      onCreated(created);
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
      <h2 className="text-sm font-semibold text-zinc-900">Nowy {collection.itemLabelSingular.toLowerCase()}</h2>

      {errorMessage && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Tytuł</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Adres (slug)</label>
          <input
            value={slug}
            onChange={(event) => setSlugOverride(slugify(event.target.value))}
            disabled={submitting}
            className={inputClass}
          />
          <p className="mt-1 truncate text-xs text-zinc-400">/{collection.key}/{slug || "..."}</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || title.trim() === "" || slug === ""}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50"
      >
        {submitting ? "Tworzenie..." : `Dodaj ${collection.itemLabelSingular.toLowerCase()}`}
      </button>
    </form>
  );
}

function ItemList({
  collection,
  items,
  session,
  onEdit,
  onDeleted,
}: {
  collection: CollectionDefinition;
  items: CollectionItemSummary[];
  session: Session | null;
  onEdit: (slug: string) => void;
  onDeleted: (slug: string) => void;
}) {
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete(item: CollectionItemSummary) {
    if (!window.confirm(`Usunąć "${item.title}"? Tej operacji nie da się cofnąć.`)) {
      return;
    }

    setPendingSlug(item.slug);
    setErrorMessage("");
    try {
      await deleteCollectionItem(collection.key, item.slug, session);
      onDeleted(item.slug);
    } catch (error) {
      const message =
        error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.";
      setErrorMessage(message);
    } finally {
      setPendingSlug(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Brak elementów.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {errorMessage && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</p>}
      <ul className="divide-y divide-zinc-100">
        {items.map((item) => (
          <li key={item.slug} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-zinc-900">{item.title}</span>
                {item.status !== "published" && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    szkic
                  </span>
                )}
              </div>
              <div className="truncate text-sm text-zinc-500">
                /{collection.key}/{item.slug} · ostatnia zmiana: {item.updatedAt}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => onEdit(item.slug)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50"
              >
                Edytuj
              </button>
              <button
                onClick={() => handleDelete(item)}
                disabled={pendingSlug === item.slug}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
              >
                {pendingSlug === item.slug ? "Usuwanie..." : "Usuń"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
