"use client";

import { useEffect, useState } from "react";
import { assignPageIdentity, fetchPageIdentityChanges, type PageIdentityChange, type Session } from "@/lib/adminApi";
import { ui } from "./ui";

/**
 * Ustawienia → Tokeny API: strony bez identyfikatora / typu w REST API v1. Pokazuje, co dostałyby
 * z reguły (backend/src/Support/PageIdentity.php), i nadaje je jednym kliknięciem. Już nadanych
 * nie zmienia; każdą wartość można potem poprawić w edytorze strony (panel „Publikacja”).
 */
export default function PageIdentityCard({ session }: { session: Session | null }) {
  const [changes, setChanges] = useState<PageIdentityChange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPageIdentityChanges(session)
      .then((result) => !cancelled && setChanges(result.changes))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Nie udało się wczytać stron."));
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleAssign() {
    setBusy(true);
    setError(null);
    try {
      const result = await assignPageIdentity(session);
      setDone(result.changes.length);
      setChanges([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się nadać identyfikatorów.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <div>
          <div className="text-sm font-semibold text-zinc-900">Identyfikatory i typy stron</div>
          <p className="text-xs text-zinc-500">
            Strona w API: <code className="font-mono">/api/v1/pages/&lt;identyfikator&gt;</code>, strony jednego rodzaju: <code className="font-mono">?type=&lt;typ&gt;</code>.
          </p>
        </div>
        {changes !== null && changes.length > 0 && (
          <button type="button" onClick={() => void handleAssign()} disabled={busy} className={ui.btnPrimarySm}>
            {busy ? "Nadawanie…" : `Nadaj brakujące (${changes.length})`}
          </button>
        )}
      </div>

      {error && <p className="px-5 py-3 text-sm text-red-600">{error}</p>}
      {changes === null && !error ? (
        <div className="h-16 animate-pulse bg-zinc-50" />
      ) : changes !== null && changes.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-zinc-500">
          {done !== null ? `Nadano — ${done} stron.` : "Wszystkie strony mają identyfikator i typ."} Zmienisz je w edytorze strony, w panelu „Publikacja”.
        </p>
      ) : changes !== null ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-zinc-100 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-5 py-2.5">Strona</th>
                <th className="px-3 py-2.5">Identyfikator</th>
                <th className="px-5 py-2.5">Typ</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.slug} className="border-b border-zinc-100 last:border-0">
                  <td className="px-5 py-2 font-mono text-[12px] text-zinc-600">{change.slug}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-zinc-900">{change.apiKey ?? <span className="text-zinc-400">bez zmian</span>}</td>
                  <td className="px-5 py-2 font-mono text-[12px] text-zinc-900">{change.apiType ?? <span className="text-zinc-400">bez zmian</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
