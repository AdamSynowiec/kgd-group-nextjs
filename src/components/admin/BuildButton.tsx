"use client";

import { useEffect, useRef, useState } from "react";
import { fetchBuildStatus, triggerBuild, type Credentials } from "@/lib/adminApi";

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

const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL || "https://github.com/AdamSynowiec/kgd-group-nextjs";

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300"
    />
  );
}

export default function BuildButton({ credentials }: { credentials: Credentials | null }) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

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
      const result = await fetchBuildStatus(dispatchedAt, credentials);

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

  async function handleClick() {
    setState({ phase: "triggering" });
    try {
      const { dispatchedAt } = await triggerBuild(credentials);
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-white/[.06]"
      >
        {busy && <Spinner />}
        {state.phase === "triggering" && "Uruchamianie..."}
        {state.phase === "waiting" && "Budowanie..."}
        {!busy && "Zbuduj stronę"}
      </button>

      {state.phase === "success" && (
        <span className="text-sm text-green-600 dark:text-green-400">
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
        <span className="text-sm text-red-600 dark:text-red-400">
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
        <span className="text-sm text-amber-600 dark:text-amber-400">
          Build trwa dłużej niż zwykle —{" "}
          <a href={`${repoUrl}/actions`} target="_blank" rel="noreferrer" className="underline">
            sprawdź ręcznie
          </a>
          .
        </span>
      )}

      {state.phase === "error" && <span className="text-sm text-red-600 dark:text-red-400">{state.message}</span>}
    </div>
  );
}
