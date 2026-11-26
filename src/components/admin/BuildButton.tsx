"use client";

import { useEffect, useRef, useState } from "react";
import { RocketIcon } from "@/components/admin/icons";
import BuildDialog from "@/components/admin/BuildDialog";
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

const MODE_LABELS: Record<BuildMode, string> = {
  pages: "wybrane strony",
  investments: "inwestycje",
  admin: "panel i API",
  site: "cały serwis",
  quick: "cały serwis",
  full: "pełny z blogiem",
};

/** Bez zaszytego fallbacku — link "sprawdź ręcznie" pokazuje się tylko, gdy projekt to skonfiguruje. */
const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL;

function Spinner() {
  return <span aria-hidden className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />;
}

/** "Zbuduj stronę" — okno wyboru zakresu (BuildDialog), potem śledzenie przebiegu w GitHub Actions. */
export default function BuildButton({ session }: { session: Session | null }) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<BuildMode>("site");

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

  async function run(mode: BuildMode, pages: string[] = []) {
    setActiveMode(mode);
    setState({ phase: "triggering" });
    try {
      const { dispatchedAt } = await triggerBuild(session, mode, pages);
      startedAtRef.current = Date.now();
      setState({ phase: "waiting" });
      pollRef.current = setInterval(() => void poll(dispatchedAt), POLL_INTERVAL_MS);
      void poll(dispatchedAt);
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }

  const busy = state.phase === "triggering" || state.phase === "waiting";

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button
        onClick={() => setDialogOpen(true)}
        disabled={busy}
        aria-haspopup="dialog"
        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-zinc-800 disabled:opacity-60"
      >
        {busy ? <Spinner /> : <RocketIcon className="h-4 w-4 text-zinc-300" />}
        {state.phase === "triggering" && "Uruchamianie..."}
        {state.phase === "waiting" && `Budowanie: ${MODE_LABELS[activeMode]}...`}
        {!busy && "Zbuduj stronę"}
      </button>

      {state.phase === "success" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
          ✓ Zbudowano pomyślnie ({MODE_LABELS[activeMode]}).
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

      {state.phase === "error" && (
        <span className="max-w-xs truncate rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/15" title={state.message}>
          {state.message}
        </span>
      )}

      {dialogOpen && (
        <BuildDialog
          session={session}
          onClose={() => setDialogOpen(false)}
          onConfirm={(choice) => {
            setDialogOpen(false);
            void run(choice.mode, choice.pages);
          }}
        />
      )}
    </div>
  );
}
