"use client";

import { useEffect, useState } from "react";
import ContentEditor from "@/components/admin/ContentEditor";
import { ui } from "@/components/admin/ui";
import { acquirePageLock, heartbeatPageLock, releasePageLock, savePage, type PageLockHolder, type Session } from "@/lib/adminApi";

/** Odnawianie blokady edycji — z zapasem względem jej TTL (60 s, MysqlPageLockRepository). */
const HEARTBEAT_MS = 15000;

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
  lockId,
  onBack,
}: {
  slug: string;
  initialContent: Record<string, unknown>;
  session: Session | null;
  /** Blokada edycji tej strony (null = bez blokady, np. migracja db/029 nieuruchomiona). */
  lockId: string | null;
  onBack: () => void;
}) {
  // Ktoś przejął edycję ("Edytuj mimo to") — od tej chwili zapis jest zablokowany (backend i tak odrzuci go 409).
  const [lostTo, setLostTo] = useState<PageLockHolder | null>(null);
  const [reclaiming, setReclaiming] = useState(false);

  // Blokada: odnawianie co 15 s, zwolnienie przy wyjściu z edytora i przy zamykaniu karty.
  useEffect(() => {
    if (!lockId) return;
    let cancelled = false;
    const beat = async () => {
      try {
        const result = await heartbeatPageLock(slug, lockId, session);
        if (!cancelled) setLostTo(result.held ? null : result.holder);
      } catch {
        // chwilowy błąd sieci — kolejna próba za 15 s; blokada wytrzyma 60 s
      }
    };
    const timer = setInterval(() => void beat(), HEARTBEAT_MS);
    const onPageHide = () => releasePageLock(slug, lockId, session);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
      releasePageLock(slug, lockId, session);
    };
  }, [slug, lockId, session]);

  async function reclaim() {
    if (!lockId) return;
    setReclaiming(true);
    try {
      const result = await acquirePageLock(slug, lockId, session, true);
      if (result.acquired) setLostTo(null);
    } finally {
      setReclaiming(false);
    }
  }
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

    await savePage(slug, { ...content, status, updatedAt: effectiveDate }, session, lockId ?? undefined);

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
      saveBlocked={lostTo !== null}
      lockNotice={
        lostTo ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 sm:flex-row sm:items-center">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-semibold text-white">
              {lostTo.login.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{lostTo.sameUser ? "Tę stronę otwarto w innej karcie" : `Edycję przejął(a) ${lostTo.login}`}</div>
              <div className="text-amber-800">Zapis jest zablokowany, żeby nie nadpisać tamtych zmian. Twoje niezapisane zmiany są tylko w tej karcie — skopiuj je, jeśli są potrzebne.</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={reclaim} disabled={reclaiming} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[13px] font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50">
                {reclaiming ? "Przejmowanie…" : "Przejmij z powrotem"}
              </button>
              <button onClick={onBack} className="rounded-lg bg-amber-600 px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-amber-700">
                Wróć do listy
              </button>
            </div>
          </div>
        ) : null
      }
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
