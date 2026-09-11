"use client";

import { useState, type ReactNode } from "react";
import EditableField from "@/components/admin/EditableField";
import Can from "@/components/admin/Can";
import { deepSet } from "@/lib/deepSet";
import type { Session } from "@/lib/adminApi";

type SaveState = "idle" | "saving" | "success" | "error";

/**
 * Rdzeń edycji DOWOLNEJ treści w konwencji {value,editable,label,type}
 * (patrz src/lib/editable.ts) — stan lokalny + EditableField + przycisk
 * zapisu. Nie wie NIC o tym, dokąd zapis trafia — to `onSave` decyduje;
 * PageEditor.tsx (jedyny dziś wrapper — strony i wpisy bloga to od refaktoru
 * ten sam mechanizm, patrz src/lib/pageTemplates.ts) woła przez nią zapis do
 * `pages`.
 */
export default function ContentEditor({
  backLabel,
  titleLabel,
  initialContent,
  session,
  onBack,
  onSave,
  beforeFields,
}: {
  /** Tekst linku powrotu, np. "Wszystkie strony". */
  backLabel: string;
  /** Podpis nad formularzem — dziś zawsze slug, ale to tylko etykieta. */
  titleLabel: string;
  initialContent: Record<string, unknown>;
  session: Session | null;
  onBack: () => void;
  /** Rzuca na błąd (np. AdminApiError) — ContentEditor sam zamienia to na komunikat. */
  onSave: (content: Record<string, unknown>) => Promise<unknown>;
  /** Dodatkowe kontrolki nad polami treści (np. status/data w PageEditor.tsx). */
  beforeFields?: ReactNode;
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
      await onSave(content);
      setSaveState("success");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-2 text-sm text-zinc-500 hover:underline">
        &larr; {backLabel}
      </button>
      <p className="mb-6 font-mono text-sm text-zinc-400">{titleLabel}</p>

      {beforeFields}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <EditableField node={content} session={session} onChange={handleChange} />

        <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-6">
          <Can session={session} permission="pages.update">
            <button
              onClick={handleSave}
              disabled={saveState === "saving"}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50"
            >
              {saveState === "saving" ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </Can>
          {saveState === "success" && <span className="text-sm text-green-600">Zapisano.</span>}
          {saveState === "error" && <span className="text-sm text-red-600">{errorMessage}</span>}
        </div>
      </div>
    </div>
  );
}
