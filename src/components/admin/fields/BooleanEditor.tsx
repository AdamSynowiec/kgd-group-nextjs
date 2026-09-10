"use client";

import type { FieldEditorProps } from "./types";

/** Edytor dla type:"bool" — przełącznik, nie tekst "true"/"false". */
export default function BooleanEditor({ label, value, path, onChange }: FieldEditorProps) {
  const checked = Boolean(value);

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(path, event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300"
      />
      <span className="text-zinc-600">{checked ? "Włączone" : "Wyłączone"}</span>
    </label>
  );
}
