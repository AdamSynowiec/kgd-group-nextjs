"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FIELD_TYPES, isFieldType } from "@/lib/fieldType";

/**
 * Edytor JSON jednego pola (tylko rola "admin"): pełny węzeł {value, editable, label, type, format, …}.
 * "Zastosuj" zmienia szkic strony — zapis jak każda inna zmiana: "Zapisz zmiany".
 * Backend (EditableMerge::definitionChanges) przyjmuje od admina: value, label, apiKey,
 * type, format, details, acl. "editable" jest zablokowane (wyłączenie zablokowałoby pole na stałe).
 */

/** Klucze definicji: usunięte w edytorze -> wysyłane jako null (backend je wtedy usuwa). */
const REMOVABLE = ["format", "details", "acl"] as const;
const SAVED_KEYS = new Set(["value", "editable", "label", "type", "format", "details", "acl", "apiKey"]);

type Check = { errors: string[]; warnings: string[]; node: Record<string, unknown> | null };

function positionOf(text: string, message: string): string {
  const match = /position (\d+)/.exec(message);
  if (!match) return "";
  const before = text.slice(0, Number(match[1]));
  const line = before.split("\n").length;
  const column = before.length - before.lastIndexOf("\n");
  return ` (linia ${line}, kolumna ${column})`;
}

function valueMatchesType(value: unknown, type: string): boolean {
  switch (type) {
    case "string":
    case "asset":
    case "richtext":
      return typeof value === "string";
    case "bool":
      return typeof value === "boolean";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "table":
      return value !== null && typeof value === "object";
    default:
      return false;
  }
}

function check(text: string, original: Record<string, unknown>): Check {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { errors: [`Niepoprawny JSON${positionOf(text, message)}. Sprawdź przecinki, cudzysłowy i nawiasy.`], warnings: [], node: null };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { errors: ["Pole musi być obiektem { … }."], warnings: [], node: null };
  }
  const node = parsed as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!("value" in node)) errors.push("Brakuje klucza \"value\".");
  if (node.editable !== original.editable) errors.push("\"editable\" nie można zmienić z panelu — przywróć " + JSON.stringify(original.editable) + ".");
  if (!isFieldType(node.type)) errors.push(`"type" musi być jednym z: ${FIELD_TYPES.join(", ")}.`);
  else if ("value" in node && !valueMatchesType(node.value, node.type)) errors.push(`"value" nie pasuje do typu "${node.type}".`);
  if ("label" in node && typeof node.label !== "string") errors.push("\"label\" musi być tekstem.");
  if ("format" in node && node.format !== null && (typeof node.format !== "string" || !/^[a-z][a-z0-9-]{0,31}$/.test(node.format))) {
    errors.push("\"format\" to krótki tekst z małych liter, np. \"inline\".");
  }
  if ("apiKey" in node && node.apiKey !== "" && (typeof node.apiKey !== "string" || !/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(node.apiKey))) {
    errors.push("\"apiKey\": litery, cyfry i „_”, zaczyna się od litery.");
  }
  if (node.format === "inline" && node.type !== "richtext") warnings.push("\"format\": \"inline\" działa tylko z \"type\": \"richtext\".");
  if (node.type === "richtext" && original.type !== "richtext") {
    warnings.push("Strona pokaże formatowanie tylko tam, gdzie komponent wyświetla pole przez <RichInline>. W innym wypadku znaczniki będą widoczne jako tekst.");
  }
  const ignored = Object.keys(node).filter((key) => !SAVED_KEYS.has(key));
  if (ignored.length > 0) warnings.push(`Nie zostaną zapisane (nieobsługiwane klucze): ${ignored.join(", ")}.`);

  return { errors, warnings, node: errors.length === 0 ? node : null };
}

export default function FieldJsonDialog({
  label,
  path,
  node,
  onApply,
  onClose,
}: {
  label: string;
  path: (string | number)[];
  node: Record<string, unknown>;
  onApply: (node: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const initialText = useMemo(() => JSON.stringify(node, null, 2), [node]);
  const [text, setText] = useState(initialText);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const result = useMemo(() => check(text, node), [text, node]);
  const changed = text !== initialText;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    textareaRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function close() {
    if (changed && !window.confirm("Porzucić zmiany w JSON-ie tego pola?")) return;
    onClose();
  }

  function apply() {
    if (!result.node) return;
    const next: Record<string, unknown> = { ...result.node };
    for (const key of REMOVABLE) if (key in node && !(key in next)) next[key] = null;
    if ("apiKey" in node && !("apiKey" in next)) next.apiKey = "";
    onApply(next);
  }

  function format() {
    if (result.node) setText(JSON.stringify(result.node, null, 2));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      apply();
    } else if (event.key === "Tab") {
      // Tab wstawia wcięcie zamiast przenosić fokus (Shift+Tab — normalnie, żeby dało się wyjść z pola).
      if (event.shiftKey) return;
      event.preventDefault();
      const target = event.currentTarget;
      const { selectionStart, selectionEnd } = target;
      const nextText = `${text.slice(0, selectionStart)}  ${text.slice(selectionEnd)}`;
      setText(nextText);
      requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2));
    }
  }

  const lines = text.split("\n").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby="field-json-title" className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-900/5">
        <div className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="field-json-title" className="truncate text-[15px] font-semibold text-zinc-900">
              JSON pola „{label}”
            </h2>
            <code className="mt-0.5 block truncate font-mono text-[11px] text-zinc-500">{path.join(" › ")}</code>
          </div>
          <button type="button" onClick={close} aria-label="Zamknij" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden bg-zinc-950">
          <div aria-hidden className="select-none overflow-hidden py-3 pl-3 pr-2 text-right font-mono text-[12.5px] leading-[1.6] text-zinc-600">
            {Array.from({ length: lines }, (_, index) => (
              <div key={index}>{index + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={(event) => {
              const gutter = event.currentTarget.previousElementSibling as HTMLElement | null;
              if (gutter) gutter.scrollTop = event.currentTarget.scrollTop;
            }}
            spellCheck={false}
            aria-label={`JSON pola ${label}`}
            aria-invalid={result.errors.length > 0}
            className="min-h-[18rem] flex-1 resize-none bg-transparent py-3 pr-4 font-mono text-[12.5px] leading-[1.6] text-zinc-100 outline-none"
          />
        </div>

        <div className="space-y-1.5 border-t border-zinc-100 px-5 py-3 text-[12px]">
          {result.errors.map((error) => (
            <p key={error} role="alert" className="flex gap-1.5 text-red-600">
              <span aria-hidden>✕</span>
              {error}
            </p>
          ))}
          {result.warnings.map((warning) => (
            <p key={warning} className="flex gap-1.5 text-amber-700">
              <span aria-hidden>!</span>
              {warning}
            </p>
          ))}
          {result.errors.length === 0 && result.warnings.length === 0 && (
            <p className="text-zinc-500">
              {changed ? "JSON poprawny." : "Edytujesz definicję pola: value, label, type, format, details, acl, apiKey."} Zmiana trafi na stronę po „Zapisz zmiany”.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
          <button type="button" onClick={format} disabled={!result.node} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-200/60 disabled:opacity-40">
            Formatuj
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(text);
              setCopied(true);
            }}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-200/60"
          >
            {copied ? "Skopiowano" : "Kopiuj"}
          </button>
          <button type="button" onClick={() => setText(initialText)} disabled={!changed} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-200/60 disabled:opacity-40">
            Przywróć
          </button>
          <span className="ml-auto hidden text-[11px] text-zinc-400 sm:inline">Ctrl+Enter — zastosuj · Esc — zamknij</span>
          <button type="button" onClick={close} className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-50">
            Anuluj
          </button>
          <button type="button" onClick={apply} disabled={!result.node || !changed} className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40">
            Zastosuj
          </button>
        </div>
      </div>
    </div>
  );
}
