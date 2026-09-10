"use client";

import { inputClass, type FieldEditorProps } from "./types";

/** Edytor dla type:"number" — wartość jest faktycznie przechowywana i odczytywana jako liczba, nie string. */
export default function NumberEditor({ label, value, path, onChange }: FieldEditorProps) {
  const num = typeof value === "number" ? value : Number(value) || 0;

  return (
    <input
      aria-label={label}
      type="number"
      value={num}
      onChange={(event) => onChange(path, Number(event.target.value))}
      className={inputClass}
    />
  );
}
