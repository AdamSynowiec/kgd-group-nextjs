"use client";

import { isEditableValue, type EditableValue } from "@/lib/editable";

type Path = (string | number)[];
type OnChange = (path: Path, value: unknown) => void;

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

/** "internalId" -> "Internal id" — heurystyka, nie słownik nazw pól. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Czy gdzieś w tym poddrzewie jest choć jedno pole editable — jeśli nie, nie ma czego pokazywać. */
function hasEditableDescendant(node: unknown): boolean {
  if (isEditableValue(node)) return true;
  if (Array.isArray(node)) return node.some(hasEditableDescendant);
  if (node !== null && typeof node === "object") {
    return Object.values(node as Record<string, unknown>).some(hasEditableDescendant);
  }
  return false;
}

/** Krótki opis elementu tablicy do etykiety ("Sekcje 1 — Hero") — czysta heurystyka, nie znajomość konkretnych pól. */
function describeArrayItem(item: unknown, fallback: string): string {
  if (item !== null && typeof item === "object" && !Array.isArray(item) && !isEditableValue(item)) {
    const record = item as Record<string, unknown>;
    const hint = record.component ?? record.title ?? record.label;
    if (typeof hint === "string") return `${fallback} — ${hint}`;
  }
  return fallback;
}

/**
 * Rekurencyjnie renderuje formularz na podstawie kształtu danych, nie listy
 * nazw pól. Węzeł {value, editable} -> kontrolka (albo widok tylko-do-odczytu);
 * zwykły obiekt/tablica -> rekursja; wszystko inne, co nie prowadzi do żadnego
 * pola editable, jest pomijane — to backend rządzi tym, co w ogóle da się edytować.
 */
export default function EditableField({
  label,
  node,
  path,
  onChange,
  root = false,
}: {
  label: string;
  node: unknown;
  path: Path;
  onChange: OnChange;
  root?: boolean;
}) {
  if (!hasEditableDescendant(node)) {
    return null;
  }

  if (isEditableValue(node)) {
    return <EditableControl label={label} node={node} path={path} onChange={onChange} />;
  }

  if (Array.isArray(node)) {
    const items = node.map((item, index) => (
      <EditableField
        key={index}
        label={describeArrayItem(item, `${label} ${index + 1}`)}
        node={item}
        path={[...path, index]}
        onChange={onChange}
      />
    ));

    if (root) return <div className="space-y-6">{items}</div>;

    return (
      <fieldset className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</legend>
        {items}
      </fieldset>
    );
  }

  if (node !== null && typeof node === "object") {
    const entries = Object.entries(node as Record<string, unknown>).map(([key, value]) => (
      <EditableField key={key} label={humanizeKey(key)} node={value} path={[...path, key]} onChange={onChange} />
    ));

    if (root) return <div className="space-y-6">{entries}</div>;

    return (
      <fieldset className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{label}</legend>
        {entries}
      </fieldset>
    );
  }

  return null;
}

function EditableControl({
  label,
  node,
  path,
  onChange,
}: {
  label: string;
  node: EditableValue;
  path: Path;
  onChange: OnChange;
}) {
  const valuePath = [...path, "value"];

  if (!node.editable) {
    return (
      <div className="mb-4">
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">{String(node.value)} · tylko do odczytu</div>
      </div>
    );
  }

  if (typeof node.value === "boolean") {
    return (
      <label className="mb-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={node.value} onChange={(event) => onChange(valuePath, event.target.checked)} />
        {label}
      </label>
    );
  }

  if (typeof node.value === "number") {
    return (
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium">{label}</label>
        <input
          type="number"
          value={node.value}
          onChange={(event) => onChange(valuePath, Number(event.target.value))}
          className={inputClass}
        />
      </div>
    );
  }

  const text = String(node.value);
  const multiline = text.length > 80 || text.includes("\n");

  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {multiline ? (
        <textarea
          value={text}
          rows={4}
          onChange={(event) => onChange(valuePath, event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type="text"
          value={text}
          onChange={(event) => onChange(valuePath, event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}
