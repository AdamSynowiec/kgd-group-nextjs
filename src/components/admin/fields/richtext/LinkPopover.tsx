"use client";

import { useState, type KeyboardEvent } from "react";
import { isSafeUrl } from "@/lib/richText/sanitizeHtml";

const buttonClass = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50";

/**
 * Panel wstawiania/edycji/usuwania linku — jako pasek WEWNĄTRZ edytora (nad
 * powierzchnią edycji), nie pływający popover przy zaznaczeniu — ten sam
 * wzorzec co pasek akcji masowych w TableEditor.tsx (spójność z resztą panelu).
 */
export default function LinkPopover({
  initialUrl,
  initialOpenInNewTab,
  isEditing,
  onConfirm,
  onRemove,
  onCancel,
}: {
  initialUrl: string;
  initialOpenInNewTab: boolean;
  isEditing: boolean;
  onConfirm: (url: string, openInNewTab: boolean) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewTab, setOpenInNewTab] = useState(initialOpenInNewTab);
  const [error, setError] = useState("");

  function handleConfirm() {
    const trimmed = url.trim();
    if (!isSafeUrl(trimmed)) {
      setError("Podaj poprawny adres: http(s)://, mailto: albo ścieżkę względną (np. /blog/inny-wpis).");
      return;
    }
    onConfirm(trimmed, openInNewTab);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2 border-b border-zinc-200 bg-blue-50 px-3 py-2">
      <div className="min-w-[220px] flex-1">
        <label htmlFor="richtext-link-url" className="mb-1 block text-xs font-medium text-zinc-600">
          Adres URL
        </label>
        <input
          id="richtext-link-url"
          type="text"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://…"
          autoFocus
          aria-invalid={error !== ""}
          aria-describedby={error !== "" ? "richtext-link-error" : undefined}
          className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
        {error && (
          <p id="richtext-link-error" role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      <label className="flex items-center gap-1.5 pt-5 text-xs text-zinc-600">
        <input type="checkbox" checked={openInNewTab} onChange={(event) => setOpenInNewTab(event.target.checked)} />
        Otwórz w nowej karcie
      </label>

      <div className="flex items-center gap-1.5 pt-5">
        <button type="button" onClick={handleConfirm} className={`${buttonClass} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`}>
          {isEditing ? "Zapisz" : "Dodaj link"}
        </button>
        {isEditing && (
          <button type="button" onClick={onRemove} className={`${buttonClass} border-red-300 text-red-600 hover:bg-red-50`}>
            Usuń link
          </button>
        )}
        <button type="button" onClick={onCancel} className={buttonClass}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
