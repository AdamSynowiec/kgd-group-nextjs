"use client";

import { useEffect, useState } from "react";
import { AdminApiError, fetchActivity, type ActivityEntry, type Session } from "@/lib/adminApi";

const PAGE_SIZE = 50;

/** "Aktywność" — historia zdarzeń w panelu (kto/co/kiedy), patrz ActivityController.php. Widoczne tylko z uprawnieniem "activity.list" (domyślnie: tylko admin). */
export default function ActivityLogPanel({ session }: { session: Session | null }) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<ActivityEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchActivity(PAGE_SIZE, page * PAGE_SIZE, session)
      .then((result) => {
        if (!cancelled) {
          setItems(result.items);
          setTotal(result.total);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, session]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Aktywność</h2>
          <p className="mt-1 text-xs text-zinc-500">Kto co zrobił w panelu, od najnowszych. {total} zdarzeń łącznie.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            ← Nowsze
          </button>
          <span className="text-xs text-zinc-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
            disabled={page + 1 >= totalPages}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-50 disabled:opacity-40"
          >
            Starsze →
          </button>
        </div>
      </div>

      {errorMessage && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      {items === null && !errorMessage && <p className="text-sm text-zinc-500">Wczytywanie...</p>}

      {items !== null && items.length === 0 && <p className="text-sm text-zinc-500">Brak zdarzeń.</p>}

      {items !== null && items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {items.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{entry.login ?? "(nieznane konto)"}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600">{entry.action}</span>
                    {entry.target && <span className="truncate text-xs text-zinc-500">{entry.target}</span>}
                  </div>
                  {entry.details && (
                    <div className="mt-1 truncate font-mono text-xs text-zinc-400">{JSON.stringify(entry.details)}</div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-400">
                  <div>{entry.createdAt}</div>
                  {entry.ipAddress && <div>{entry.ipAddress}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
