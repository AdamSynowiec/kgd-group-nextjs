"use client";

import { useState } from "react";
import EditableField from "@/components/admin/EditableField";
import { deepSet } from "@/lib/deepSet";
import { savePage, type Session } from "@/lib/adminApi";

type SaveState = "idle" | "saving" | "success" | "error";

export default function PageEditor({
  slug,
  initialContent,
  session,
  onBack,
}: {
  slug: string;
  initialContent: Record<string, unknown>;
  session: Session | null;
  onBack: () => void;
}) {
  const [content, setContent] = useState(initialContent);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function handleChange(path: (string | number)[], value: unknown) {
    setContent((prev) => deepSet(prev, path, value));
    setSaveState("idle");
  }

  async function handleSave() {
    setSaveState("saving");
    setErrorMessage("");
    try {
      await savePage(slug, content, session);
      setSaveState("success");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-2 text-sm text-zinc-500 hover:underline">
        &larr; Wszystkie strony
      </button>
      <p className="mb-6 font-mono text-sm text-zinc-400">{slug}</p>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <EditableField node={content} onChange={handleChange} />

        <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-6">
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50"
          >
            {saveState === "saving" ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
          {saveState === "success" && (
            <span className="text-sm text-green-600">Zapisano.</span>
          )}
          {saveState === "error" && <span className="text-sm text-red-600">{errorMessage}</span>}
        </div>
      </div>
    </div>
  );
}
