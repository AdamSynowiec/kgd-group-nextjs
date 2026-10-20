"use client";

import { inputClass, type FieldEditorProps } from "./types";

/** Edytor dla type:"string" — pojedynczy input albo textarea (dobierane po długości/obecności nowej linii). */
export default function StringEditor({ label, value, path, onChange }: FieldEditorProps) {
  const text = typeof value === "string" ? value : String(value ?? "");
  const multiline = text.length > 80 || text.includes("\n");

  return multiline ? (
    <textarea
      aria-label={label}
      value={text}
      rows={Math.min(12, Math.max(3, Math.ceil(text.length / 90) + text.split("\n").length - 1))}
      onChange={(event) => onChange(path, event.target.value)}
      className={`${inputClass} resize-y leading-relaxed`}
    />
  ) : (
    <input
      aria-label={label}
      type="text"
      value={text}
      onChange={(event) => onChange(path, event.target.value)}
      className={inputClass}
    />
  );
}
