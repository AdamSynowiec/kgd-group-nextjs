"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, RocketIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";
import { fetchBuildStatus, triggerBuild, type BuildMode, type Session } from "@/lib/adminApi";

type State =
  | { phase: "idle" }
  | { phase: "triggering" }
  | { phase: "waiting" }
  | { phase: "success"; htmlUrl: string | null }
  | { phase: "failure"; htmlUrl: string | null; conclusion: string }
  | { phase: "timeout" }
  | { phase: "error"; message: string };

const POLL_INTERVAL_MS = 4000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minut — dłużej niż realistyczny czas builda + deployu

/** Gdy "1", pełny build uruchamia się bez okna z ostrzeżeniem (checkbox "nie pokazuj więcej"). */
const SKIP_WARNING_KEY = "kgd.admin.skipFullBuildWarning";

function readSkipWarning(): boolean {
  try {
    return window.localStorage.getItem(SKIP_WARNING_KEY) === "1";
  } catch {
    return false;
  }
}

/** Bez zaszytego fallbacku — link "sprawdź ręcznie" pokazuje się tylko, gdy projekt to skonfiguruje. */
const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL;

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
    />
  );
}

export default function BuildButton({ session }: { session: Session | null }) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeMode, setActiveMode] = useState<BuildMode>("quick");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sprząta cykliczne odpytywanie, gdyby komponent zniknął w trakcie (np. wylogowanie).
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function poll(dispatchedAt: string) {
    if (Date.now() - startedAtRef.current > MAX_WAIT_MS) {
      stopPolling();
      setState({ phase: "timeout" });
      return;
    }

    try {
      const result = await fetchBuildStatus(dispatchedAt, session);

      if (result.status !== "completed") {
        // "pending" (GitHub jeszcze nie pokazuje przebiegu), "queued", "in_progress" — czekamy dalej.
        return;
      }

      stopPolling();

      if (result.conclusion === "success") {
        setState({ phase: "success", htmlUrl: result.htmlUrl });
      } else {
        setState({ phase: "failure", htmlUrl: result.htmlUrl, conclusion: result.conclusion ?? "nieznany" });
      }
    } catch (error) {
      stopPolling();
      setState({ phase: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }

  async function run(mode: BuildMode) {
    setActiveMode(mode);
    setState({ phase: "triggering" });
    try {
      const { dispatchedAt } = await triggerBuild(session, mode);
      startedAtRef.current = Date.now();
      setState({ phase: "waiting" });
      pollRef.current = setInterval(() => void poll(dispatchedAt), POLL_INTERVAL_MS);
      void poll(dispatchedAt);
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }

  /** Wybór z menu: pełny build pyta o potwierdzenie, chyba że użytkownik wcześniej zaznaczył "nie pokazuj więcej". */
  function handleFullBuild() {
    setMenuOpen(false);
    if (readSkipWarning()) {
      void run("full");
      return;
    }
    setDontShowAgain(false);
    setConfirmOpen(true);
  }

  function confirmFullBuild() {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(SKIP_WARNING_KEY, "1");
      } catch {
        // brak localStorage (tryb prywatny) — ostrzeżenie po prostu pokaże się znowu
      }
    }
    setConfirmOpen(false);
    void run("full");
  }

  const busy = state.phase === "triggering" || state.phase === "waiting";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div ref={menuRef} className="relative flex">
        <button
          onClick={() => void run("quick")}
          disabled={busy}
          className="flex items-center gap-2 rounded-l-lg bg-zinc-900 py-2 pl-3.5 pr-3 text-sm font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-zinc-800 disabled:opacity-60"
        >
          {busy ? <Spinner /> : <RocketIcon className="h-4 w-4 text-zinc-300" />}
          {state.phase === "triggering" && "Uruchamianie..."}
          {state.phase === "waiting" && (activeMode === "full" ? "Budowanie (pełny)..." : "Budowanie...")}
          {!busy && "Zbuduj stronę"}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={busy}
          aria-label="Więcej opcji budowania"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center rounded-r-lg border-l border-white/10 bg-zinc-900 px-2 py-2 text-zinc-300 shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition hover:bg-zinc-800 hover:text-white disabled:opacity-60"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200/80 bg-white p-1 shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18)]">
            <button
              role="menuitem"
              onClick={handleFullBuild}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Pełny build
              <span className="mt-0.5 block text-xs font-normal text-zinc-500">Przebuduje i wgra całą stronę, razem z blogiem</span>
            </button>
          </div>
        )}
      </div>

      {state.phase === "success" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
          ✓ Zbudowano pomyślnie.
          {state.htmlUrl && (
            <>
              {" "}
              <a href={state.htmlUrl} target="_blank" rel="noreferrer" className="underline">
                szczegóły
              </a>
            </>
          )}
        </span>
      )}

      {state.phase === "failure" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/15">
          Build zakończył się błędem ({state.conclusion}).
          {state.htmlUrl && (
            <>
              {" "}
              <a href={state.htmlUrl} target="_blank" rel="noreferrer" className="underline">
                szczegóły
              </a>
            </>
          )}
        </span>
      )}

      {state.phase === "timeout" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          Build trwa dłużej niż zwykle.
          {repoUrl && (
            <>
              {" "}
              <a href={`${repoUrl}/actions`} target="_blank" rel="noreferrer" className="underline">
                Sprawdź ręcznie
              </a>
              .
            </>
          )}
        </span>
      )}

      {state.phase === "error" && <span className="max-w-xs truncate rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/15" title={state.message}>{state.message}</span>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="full-build-title">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-2xl">
            <h2 id="full-build-title" className="text-base font-semibold text-zinc-900">
              Pełna przebudowa strony
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">
              To przebuduje i wgra na serwer całą stronę, razem ze wszystkimi wpisami bloga. Może to potrwać nawet kilkanaście minut.
              Czy na pewno chcesz kontynuować?
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
              Nie pokazuj więcej tej wiadomości
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} className={ui.btnSecondary}>
                Anuluj
              </button>
              <button onClick={confirmFullBuild} className={ui.btnPrimary}>
                Uruchom pełny build
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
