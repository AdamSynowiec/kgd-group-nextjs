"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/admin/icons";
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
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
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
    <div className="flex flex-wrap items-center gap-3">
      <div ref={menuRef} className="relative flex">
        <button
          onClick={() => void run("quick")}
          disabled={busy}
          className="flex items-center gap-2 rounded-l-full border border-zinc-300 py-2 pl-4 pr-3 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50"
        >
          {busy && <Spinner />}
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
          className="flex items-center rounded-r-full border border-l-0 border-zinc-300 px-2.5 py-2 text-zinc-500 transition-colors hover:bg-black/[.04] disabled:opacity-50"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
            <button
              role="menuitem"
              onClick={handleFullBuild}
              className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Pełny build
              <span className="block text-xs text-zinc-400">Przebuduje i wgra całą stronę, razem z blogiem</span>
            </button>
          </div>
        )}
      </div>

      {state.phase === "success" && (
        <span className="text-sm text-green-600">
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
        <span className="text-sm text-red-600">
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
        <span className="text-sm text-amber-600">
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

      {state.phase === "error" && <span className="text-sm text-red-600">{state.message}</span>}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="full-build-title">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
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
              <button onClick={() => setConfirmOpen(false)} className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Anuluj
              </button>
              <button onClick={confirmFullBuild} className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
                Uruchom pełny build
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
