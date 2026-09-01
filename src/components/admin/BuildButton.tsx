"use client";

import { useState } from "react";
import { triggerBuild, type Credentials } from "@/lib/adminApi";

type State = "idle" | "triggering" | "success" | "error";

const repoUrl = process.env.NEXT_PUBLIC_GITHUB_REPO_URL || "https://github.com/AdamSynowiec/kgd-group-nextjs";

export default function BuildButton({ credentials }: { credentials: Credentials | null }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function handleClick() {
    setState("triggering");
    setMessage("");
    try {
      await triggerBuild(credentials);
      setState("success");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={handleClick}
        disabled={state === "triggering"}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-white/[.06]"
      >
        {state === "triggering" ? "Uruchamianie builda..." : "Zbuduj stronę"}
      </button>

      {state === "success" && (
        <span className="text-sm text-green-600 dark:text-green-400">
          Build wystartował —{" "}
          <a href={`${repoUrl}/actions`} target="_blank" rel="noreferrer" className="underline">
            sprawdź postęp
          </a>
          .
        </span>
      )}

      {state === "error" && <span className="text-sm text-red-600 dark:text-red-400">{message}</span>}
    </div>
  );
}
