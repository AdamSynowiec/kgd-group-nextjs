"use client";

import type { FieldEditorProps } from "./types";

/** Edytor dla type:"bool" — przełącznik, nie tekst "true"/"false". */
export default function BooleanEditor({ label, value, path, onChange }: FieldEditorProps) {
  const checked = Boolean(value);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(path, !checked)}
      className="group inline-flex items-center gap-3 text-sm"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 group-focus-visible:ring-4 group-focus-visible:ring-indigo-500/20 ${
          checked ? "bg-indigo-600" : "bg-zinc-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(16,24,40,0.2)] transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </span>
      <span className={checked ? "font-medium text-zinc-900" : "text-zinc-500"}>{checked ? "Włączone" : "Wyłączone"}</span>
    </button>
  );
}
