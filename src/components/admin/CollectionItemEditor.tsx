"use client";

import { useState } from "react";
import ContentEditor from "@/components/admin/ContentEditor";
import { saveCollectionItem, type CollectionItem, type Session } from "@/lib/adminApi";
import type { CollectionDefinition } from "@/lib/collections/registry";

const selectClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Cienki wrapper ContentEditor dla elementu kolekcji — drugie użycie tego
 * samego rdzenia co PageEditor.tsx. Jedyna różnica: "status"/"data publikacji"
 * to PRAWDZIWE kolumny SQL (patrz db/007_create_collection_items_table.sql),
 * nie pola w treści, więc mają własne kontrolki nad EditableField zamiast
 * przechodzić przez ten sam mechanizm co "title"/"body" itd.
 */
export default function CollectionItemEditor({
  collection,
  item,
  session,
  onBack,
}: {
  collection: CollectionDefinition;
  item: CollectionItem;
  session: Session | null;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<"draft" | "published">(item.status === "published" ? "published" : "draft");
  const [publishedAt, setPublishedAt] = useState<string | null>(item.publishedAt);

  async function handleSave(content: Record<string, unknown>) {
    // Pierwsza publikacja bez ręcznie podanej daty -> dziś. Kolejne zapisy
    // (już opublikowanego wpisu) nie nadpisują istniejącej daty.
    const effectivePublishedAt = status === "published" && !publishedAt ? todayIsoDate() : publishedAt;

    await saveCollectionItem(
      collection.key,
      item.slug,
      { content, status, publishedAt: effectivePublishedAt },
      session
    );

    if (effectivePublishedAt !== publishedAt) {
      setPublishedAt(effectivePublishedAt);
    }
  }

  return (
    <ContentEditor
      backLabel={`Wszystkie: ${collection.label}`}
      titleLabel={item.slug}
      initialContent={item.content}
      session={session}
      onBack={onBack}
      onSave={handleSave}
      beforeFields={
        <div className="mb-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value === "published" ? "published" : "draft")}
              className={selectClass}
            >
              <option value="draft">Szkic</option>
              <option value="published">Opublikowany</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data publikacji</label>
            <input
              type="date"
              value={publishedAt ?? ""}
              onChange={(event) => setPublishedAt(event.target.value || null)}
              className={selectClass}
            />
            <p className="mt-1 text-xs text-zinc-400">
              {status === "published" && !publishedAt ? "Puste -> ustawi się na dziś przy zapisie." : "Wpływa na kolejność na liście (najnowsze pierwsze)."}
            </p>
          </div>
        </div>
      }
    />
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
