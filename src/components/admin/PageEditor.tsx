"use client";

import { useState } from "react";
import ContentEditor from "@/components/admin/ContentEditor";
import { savePage, type Session } from "@/lib/adminApi";

const selectClass = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Cienki wrapper ContentEditor dla stron w `pages` (w tym wpisów bloga —
 * zwykłe strony z parent:"/blog", patrz src/lib/pageTemplates.ts).
 *
 * "status"/"updatedAt" mają WŁASNE kontrolki (nie EditableField) z tego
 * samego powodu co dawniej w CollectionItemEditor.tsx: to plain stringi w
 * treści, nie węzły {value,editable} (patrz db/schema.sql — "status" i
 * "updatedAt" są tam zawsze gołymi wartościami) — EditableField/EditableMerge
 * celowo ich nie rusza (patrz komentarz w EditableMerge.php), więc bez tego
 * bloku nie dałoby się ich w ogóle zmienić z panelu.
 */
export default function PageEditor({
  slug,
  initialContent,
  session,
  onBack,
}: {
  slug: string;
  initialContent: Record<string, unknown>;
  session: Session | null;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<"draft" | "published">(initialContent.status === "published" ? "published" : "draft");
  const [date, setDate] = useState<string>(typeof initialContent.updatedAt === "string" ? initialContent.updatedAt : "");

  async function handleSave(content: Record<string, unknown>) {
    // Pierwszy zapis bez ręcznie podanej daty -> dziś. Kolejne zapisy nie
    // nadpisują już wybranej daty (ten sam kompromis co dawniej w
    // CollectionItemEditor.tsx).
    const effectiveDate = date || todayIsoDate();

    await savePage(slug, { ...content, status, updatedAt: effectiveDate }, session);

    if (effectiveDate !== date) {
      setDate(effectiveDate);
    }
  }

  return (
    <ContentEditor
      backLabel="Wszystkie strony"
      titleLabel={slug}
      initialContent={initialContent}
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
            <label className="mb-1 block text-sm font-medium text-zinc-700">Data</label>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={selectClass} />
            <p className="mt-1 text-xs text-zinc-400">
              {date === "" ? "Puste -> ustawi się na dziś przy zapisie." : "Widoczna np. jako data wpisu bloga i w sitemapie."}
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
