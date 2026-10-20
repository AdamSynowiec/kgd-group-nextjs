"use client";

import { useState } from "react";
import ContentEditor from "@/components/admin/ContentEditor";
import { ui } from "@/components/admin/ui";
import { savePage, type Session } from "@/lib/adminApi";

type Status = "draft" | "published";

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
  const initialStatus: Status = initialContent.status === "published" ? "published" : "draft";
  const initialDate = typeof initialContent.updatedAt === "string" ? initialContent.updatedAt : "";
  const [status, setStatus] = useState<Status>(initialStatus);
  const [date, setDate] = useState<string>(initialDate);
  const [saved, setSaved] = useState({ status: initialStatus, date: initialDate });

  async function handleSave(content: Record<string, unknown>) {
    // Pierwszy zapis bez ręcznie podanej daty -> dziś. Kolejne zapisy nie
    // nadpisują już wybranej daty (ten sam kompromis co dawniej w
    // CollectionItemEditor.tsx).
    const effectiveDate = date || todayIsoDate();

    await savePage(slug, { ...content, status, updatedAt: effectiveDate }, session);

    if (effectiveDate !== date) {
      setDate(effectiveDate);
    }
    setSaved({ status, date: effectiveDate });
  }

  return (
    <ContentEditor
      backLabel="Wszystkie strony"
      titleLabel={slug}
      initialContent={initialContent}
      session={session}
      onBack={onBack}
      onSave={handleSave}
      extraDirty={status !== saved.status || date !== saved.date}
      beforeFields={
        <div className={`${ui.card} p-4`}>
          <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Publikacja</div>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200/60" role="radiogroup" aria-label="Status strony">
            {(
              [
                ["draft", "Szkic", "bg-amber-400"],
                ["published", "Opublikowana", "bg-emerald-500"],
              ] as const
            ).map(([value, label, dot]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={status === value}
                onClick={() => setStatus(value)}
                className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition ${
                  status === value ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-zinc-200/80" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${status === value ? dot : "bg-zinc-300"}`} />
                {label}
              </button>
            ))}
          </div>
          <p className={ui.hint}>{status === "draft" ? "Szkic nie jest widoczny na stronie po zbudowaniu." : "Strona trafi na serwer przy najbliższym buildzie."}</p>

          <label htmlFor="page-date" className={`${ui.label} mt-4`}>
            Data
          </label>
          <input id="page-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={ui.input} />
          <p className={ui.hint}>{date === "" ? "Puste — ustawi się na dziś przy zapisie." : "Widoczna np. jako data wpisu bloga i w sitemapie."}</p>
        </div>
      }
    />
  );
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
