"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";
import { acquirePageLock, type PageLockHolder, type Session } from "@/lib/adminApi";

const WAIT_POLL_MS = 5000;

/**
 * Strona jest otwarta w edytorze u kogoś innego (blokada z PageLockController).
 * Do wyboru: poczekać (sprawdzanie co 5 s, edytor otwiera się sam, gdy strona się
 * zwolni), edytować mimo to (przejęcie — tamta osoba nie zapisze już swoich zmian)
 * albo wrócić do listy.
 */
export default function PageLockedNotice({
  slug,
  title,
  lockId,
  holder: initialHolder,
  session,
  onAcquired,
  onBack,
}: {
  slug: string;
  title: string;
  lockId: string;
  holder: PageLockHolder;
  session: Session | null;
  onAcquired: () => void;
  onBack: () => void;
}) {
  const [holder, setHolder] = useState(initialHolder);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const waiting = waitingSince !== null;
  const [confirmForce, setConfirmForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const onAcquiredRef = useRef(onAcquired);
  useEffect(() => {
    onAcquiredRef.current = onAcquired;
  });

  // Zegar do "aktywny X s temu" / "czekasz od ...".
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Czekanie: co 5 s próba zajęcia strony (bez przejmowania).
  useEffect(() => {
    if (!waiting) return;
    let cancelled = false;
    const originalTitle = document.title;
    const tick = async () => {
      try {
        const result = await acquirePageLock(slug, lockId, session);
        if (cancelled) return;
        if (result.acquired) {
          notify(`${title} — możesz edytować`, `${holder.login} skończył(a) edycję.`);
          document.title = originalTitle;
          onAcquiredRef.current();
          return;
        }
        if (result.holder) setHolder(result.holder);
      } catch {
        // chwilowy błąd sieci — spróbujemy przy następnym cyklu
      }
    };
    const timer = setInterval(() => void tick(), WAIT_POLL_MS);
    document.title = `⏳ Czekasz: ${title}`;
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.title = originalTitle;
    };
  }, [waiting, slug, lockId, session, title, holder.login]);

  async function startWaiting() {
    // Powiadomienie systemowe, gdy strona się zwolni (jeśli użytkownik pozwoli) — można pracować w innej karcie.
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
    setWaitingSince(Date.now());
  }

  async function forceEdit() {
    setBusy(true);
    setError("");
    try {
      const result = await acquirePageLock(slug, lockId, session, true);
      if (result.acquired) onAcquired();
      else setError("Nie udało się przejąć edycji — spróbuj ponownie.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przejąć edycji.");
    } finally {
      setBusy(false);
    }
  }

  const activeAgo = Math.max(0, Math.round((now - new Date(holder.heartbeatAt).getTime()) / 1000));
  const since = new Date(holder.acquiredAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const waitedFor = waitingSince !== null ? Math.max(0, Math.round((now - waitingSince) / 1000)) : 0;

  return (
    <div className="mx-auto max-w-xl pt-6 sm:pt-12">
      <button onClick={onBack} className={`${ui.btnGhost} -ml-3 mb-4`}>
        <ArrowLeftIcon className="h-4 w-4" />
        Wszystkie strony
      </button>

      <div className={`${ui.card} overflow-hidden`}>
        <div className="flex items-start gap-4 border-b border-zinc-100 p-6">
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-semibold text-white">
            {holder.login.charAt(0).toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-zinc-900">
              {holder.sameUser ? "Masz już tę stronę otwartą" : <>Stronę edytuje teraz <span className="text-amber-700">{holder.login}</span></>}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-800">{title}</span> <span className="font-mono text-xs text-zinc-500">{slug}</span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {holder.sameUser ? "W innej karcie przeglądarki albo na innym urządzeniu" : `Edytuje od ${since}`} · aktywność {activeAgo < 5 ? "przed chwilą" : `${activeAgo} s temu`}
            </p>
          </div>
        </div>

        <div className="space-y-3 p-6">
          {error && <p className={ui.alertError}>{error}</p>}

          {waiting ? (
            <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">Czekasz, aż {holder.login} skończy edycję…</div>
                <div className="text-xs text-indigo-700/80">
                  Sprawdzam co {WAIT_POLL_MS / 1000} s · czekasz {formatDuration(waitedFor)}. Edytor otworzy się sam — możesz w tym czasie pracować w innej karcie.
                </div>
              </div>
              <button onClick={() => setWaitingSince(null)} className={ui.btnSecondarySm}>
                Przestań czekać
              </button>
            </div>
          ) : (
            <button onClick={startWaiting} className={`${ui.btnPrimary} w-full`}>
              Poczekaj, aż {holder.sameUser ? "zamkniesz tamtą kartę" : `${holder.login} skończy`}
            </button>
          )}

          {!confirmForce ? (
            <button onClick={() => setConfirmForce(true)} className={`${ui.btnSecondary} w-full`}>
              Edytuj mimo to
            </button>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium">Przejąć edycję?</div>
              <p className="mt-1 text-amber-800">
                {holder.sameUser ? "Tamta karta" : holder.login} straci możliwość zapisu — niezapisane zmiany w tamtym edytorze przepadną. Otworzysz aktualną, zapisaną wersję strony.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={forceEdit} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50">
                  {busy ? "Przejmowanie…" : "Tak, przejmij edycję"}
                </button>
                <button onClick={() => setConfirmForce(false)} disabled={busy} className={ui.btnSecondary}>
                  Anuluj
                </button>
              </div>
            </div>
          )}

          <p className="pt-1 text-center text-xs text-zinc-400">Jeśli {holder.sameUser ? "tamta karta" : holder.login} zamknie przeglądarkę bez wychodzenia z edytora, blokada wygaśnie sama po minucie.</p>
        </div>
      </div>
    </div>
  );
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body });
    }
  } catch {
    // powiadomienia niedostępne — edytor i tak się otworzy
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}
