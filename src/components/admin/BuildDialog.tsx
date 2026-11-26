"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/components/admin/ui";
import { fetchBuildChanges, fetchPages, type BuildChanges, type BuildMode, type PageSummary, type Session } from "@/lib/adminApi";

/**
 * Okno "Zbuduj stronę" — wybór zakresu. Każdy wariant buduje serwis tak samo (next build),
 * różni się tym, CO trafia na serwer (FTP) — strony spoza zakresu zostają w poprzedniej
 * wersji (scripts/deploy-scope.mjs). Stąd ostrzeżenia przy zmianach elementów wspólnych.
 */

export type BuildChoice = { mode: Exclude<BuildMode, "quick">; pages: string[] };

const OPTIONS: { mode: BuildChoice["mode"]; title: string; description: string; time: string }[] = [
  { mode: "pages", title: "Szybki — tylko wybrane strony", description: "Wgrywa na serwer wyłącznie zaznaczone strony (z ich podstronami). Po zmianie treści jednej inwestycji czy podstrony.", time: "najszybszy" },
  { mode: "investments", title: "Wszystkie inwestycje", description: "Wszystkie strony /inwestycja/… — bez bloga i bez pozostałych podstron.", time: "szybki" },
  { mode: "admin", title: "Panel admina i API", description: "Tylko panel /admin i backend /api — po zmianach w samym panelu. Strony serwisu bez zmian.", time: "szybki" },
  { mode: "site", title: "Cały serwis bez bloga", description: "Wszystkie strony KGD oprócz wpisów bloga. Po zmianie elementów wspólnych: stopka, menu, kontakt, przycisk telefonu.", time: "średni" },
  { mode: "full", title: "Pełny, z blogiem", description: "Absolutnie wszystko, razem z wpisami bloga.", time: "najdłuższy — do kilkunastu minut" },
];

function formatTime(value: string): string {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function BuildDialog({ session, onConfirm, onClose }: { session: Session | null; onConfirm: (choice: BuildChoice) => void; onClose: () => void }) {
  const [mode, setMode] = useState<BuildChoice["mode"] | null>(null);
  const [changes, setChanges] = useState<BuildChanges | null>(null);
  const [changesError, setChangesError] = useState(false);
  const [allPages, setAllPages] = useState<PageSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchBuildChanges(session)
      .then((result) => {
        if (cancelled) return;
        setChanges(result);
        setSelected(new Set(result.pages.map((page) => page.slug)));
        setMode((current) => current ?? (result.pages.length > 0 ? "pages" : "site"));
      })
      .catch(() => {
        if (cancelled) return;
        setChangesError(true);
        setMode((current) => current ?? "site");
      });
    fetchPages(session)
      .then((pages) => !cancelled && setAllPages(pages))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changedSlugs = useMemo(() => new Set(changes?.pages.map((page) => page.slug) ?? []), [changes]);
  const titles = useMemo(() => new Map(allPages.map((page) => [page.slug, page.title])), [allPages]);
  // Lista do wyboru: najpierw zmienione, potem pozostałe dodane ręcznie (zaznaczone).
  const listed = useMemo(() => {
    const slugs = [...(changes?.pages.map((page) => page.slug) ?? [])];
    for (const slug of selected) if (!slugs.includes(slug)) slugs.push(slug);
    return slugs;
  }, [changes, selected]);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return [];
    return allPages
      .filter((page) => !listed.includes(page.slug) && (page.slug.toLowerCase().includes(q) || page.title.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [allPages, listed, query]);

  const selectedPages = listed.filter((slug) => selected.has(slug));
  const sharedTouched = selectedPages.includes("/");
  const canRun = mode !== null && (mode !== "pages" || selectedPages.length > 0);

  function toggle(slug: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });
  }

  function confirm() {
    if (!canRun || mode === null) return;
    onConfirm({ mode, pages: mode === "pages" ? selectedPages : [] });
  }

  // Portal do <body>: rodzic z backdrop-filter (np. górny pasek) zamyka position:fixed w swoim obszarze.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="build-dialog-title" className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl">
        <div className="border-b border-zinc-100 px-6 py-4">
          <h2 id="build-dialog-title" className="text-base font-semibold text-zinc-900">
            Co zbudować?
          </h2>
          <p className="mt-0.5 text-[13px] text-zinc-500">Wybierz, co ma trafić na serwer. Pozostałe strony zostaną w obecnej wersji.</p>
        </div>

        <div role="radiogroup" aria-label="Zakres builda" className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {OPTIONS.map((option) => {
            const active = mode === option.mode;
            return (
              <div key={option.mode} className={`rounded-xl border transition ${active ? "border-zinc-900 ring-4 ring-zinc-900/5" : "border-zinc-200 hover:border-zinc-300"}`}>
                <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
                  <input type="radio" name="build-mode" checked={active} onChange={() => setMode(option.mode)} className="mt-1 h-4 w-4 shrink-0 border-zinc-300 text-zinc-900" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-sm font-medium text-zinc-900">{option.title}</span>
                      <span className="text-[11px] text-zinc-400">{option.time}</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-zinc-500">{option.description}</span>
                  </span>
                </label>

                {active && option.mode === "pages" && (
                  <div className="border-t border-zinc-100 px-4 pb-4 pt-3">
                    {changes === null && !changesError && <div className="h-10 animate-pulse rounded-lg bg-zinc-50" />}
                    {changesError && <p className="text-[12px] text-amber-700">Nie udało się sprawdzić, co się zmieniło — dodaj strony ręcznie.</p>}
                    {changes !== null && (
                      <p className="mb-2 text-[12px] text-zinc-500">
                        {changes.pages.length > 0
                          ? `Zmienione ${changes.since ? `od ostatniego buildu całego serwisu (${formatTime(changes.since)})` : "w panelu"} — zaznaczone automatycznie:`
                          : "Brak zapisanych zmian od ostatniego buildu całego serwisu — dodaj strony ręcznie."}
                      </p>
                    )}

                    {listed.length > 0 && (
                      <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                        {listed.map((slug) => {
                          const change = changes?.pages.find((page) => page.slug === slug);
                          return (
                            <li key={slug}>
                              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-zinc-50">
                                <input type="checkbox" checked={selected.has(slug)} onChange={(event) => toggle(slug, event.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] text-zinc-800">{titles.get(slug) ?? slug}</span>
                                  <span className="block truncate font-mono text-[11px] text-zinc-400">{slug}</span>
                                </span>
                                <span className="shrink-0 text-right text-[11px] text-zinc-400">
                                  {change ? (
                                    <>
                                      {formatTime(change.changedAt)}
                                      {change.login && <span className="block">{change.login}</span>}
                                    </>
                                  ) : (
                                    !changedSlugs.has(slug) && "dodana ręcznie"
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <div className="relative mt-2">
                      <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Dodaj stronę — wpisz nazwę lub adres…"
                        aria-label="Dodaj stronę do szybkiego buildu"
                        className={`${ui.input} py-1.5 text-[13px]`}
                      />
                      {suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                          {suggestions.map((page) => (
                            <li key={page.slug}>
                              <button
                                type="button"
                                onClick={() => {
                                  toggle(page.slug, true);
                                  setQuery("");
                                }}
                                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-zinc-50"
                              >
                                <span className="truncate text-[13px] text-zinc-800">{page.title}</span>
                                <span className="shrink-0 font-mono text-[11px] text-zinc-400">{page.slug}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {sharedTouched && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
                        Strona główna przechowuje elementy wspólne całego serwisu (m.in. przycisk telefonu). Jeśli zmiana ich dotyczy, wybierz „Cały serwis bez bloga” — inaczej pozostałe strony pokażą starą wersję.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50/60 px-6 py-3">
          <button type="button" onClick={onClose} className={ui.btnSecondary}>
            Anuluj
          </button>
          <button type="button" onClick={confirm} disabled={!canRun} className={ui.btnPrimary}>
            {mode === "pages" && selectedPages.length > 0 ? `Zbuduj (${selectedPages.length} ${selectedPages.length === 1 ? "strona" : selectedPages.length < 5 ? "strony" : "stron"})` : "Zbuduj"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
