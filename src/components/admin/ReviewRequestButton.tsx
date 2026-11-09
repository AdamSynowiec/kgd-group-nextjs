"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchMyChanges, PAGE_SAVED_EVENT, requestReview, type Session } from "@/lib/adminApi";
import { CheckIcon, CloseIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";

/**
 * Górny pasek edytora (bez "changes.review"): "Powiadom o zmianach (N)" — prośba do admina
 * o weryfikację i akceptację zmian (backend: ReviewController::request). Licznik odświeża
 * się po każdym zapisie strony (PAGE_SAVED_EVENT z PageEditor.tsx).
 */
export default function ReviewRequestButton({ session }: { session: Session | null }) {
  const [pending, setPending] = useState<number | null>(null);
  const [requested, setRequested] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    fetchMyChanges(session)
      .then((mine) => {
        setPending(mine.pending);
        setRequested(mine.request?.createdAt ?? null);
      })
      .catch(() => setPending(null)); // brak tabel db/042 albo uprawnień — przycisk się nie pokazuje
  }, [session]);

  useEffect(() => {
    load();
    window.addEventListener(PAGE_SAVED_EVENT, load);
    return () => window.removeEventListener(PAGE_SAVED_EVENT, load);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !sending && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sending]);

  async function send() {
    setSending(true);
    setError("");
    try {
      await requestReview(session, message);
      setSent(true);
      setMessage("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wysłać prośby.");
    } finally {
      setSending(false);
    }
  }

  if (pending === null || pending === 0) return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setSent(false);
          setError("");
        }}
        className={requested ? ui.btnSecondary : ui.btnPrimary}
        title={requested ? "Prośba o weryfikację już wysłana — możesz ją ponowić z nową wiadomością" : "Poproś administratora o weryfikację i akceptację zmian"}
      >
        {requested ? <CheckIcon className="h-4 w-4 text-emerald-600" /> : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />}
        {requested ? "Wysłano do akceptacji" : "Powiadom o zmianach"}
        <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums ring-1 ring-inset ring-current/20">{pending}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-4 py-16 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="review-request-title">
          <div className="absolute inset-0" onClick={() => !sending && setOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200/80 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
              <div>
                <h2 id="review-request-title" className="text-base font-semibold text-zinc-900">
                  Powiadom o zmianach
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Zmiany czekające na akceptację: <b className="font-semibold tabular-nums text-zinc-800">{pending}</b>. Trafią na stronę, gdy administrator je zatwierdzi i zbuduje stronę.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={sending} aria-label="Zamknij" className={ui.iconBtn}>
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              {sent ? (
                <p className={ui.alertSuccess}>Wysłano — administrator zobaczy prośbę w swoim panelu.</p>
              ) : (
                <>
                  {error && <p className={ui.alertError}>{error}</p>}
                  {requested && <p className="text-xs text-zinc-500">Prośba jest już wysłana — nowa wiadomość ją zastąpi.</p>}
                  <label htmlFor="review-request-message" className={ui.label}>
                    Wiadomość dla administratora (opcjonalnie)
                  </label>
                  <textarea
                    id="review-request-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={sending}
                    rows={4}
                    autoFocus
                    placeholder="np. Zaktualizowałem ceny lokali w Fox Hills."
                    className={ui.input}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 rounded-b-2xl border-t border-zinc-100 bg-zinc-50/60 px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} disabled={sending} className={ui.btnSecondary}>
                {sent ? "Zamknij" : "Anuluj"}
              </button>
              {!sent && (
                <button type="button" onClick={send} disabled={sending} className={ui.btnPrimary}>
                  {sending ? "Wysyłanie..." : "Wyślij do akceptacji"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
