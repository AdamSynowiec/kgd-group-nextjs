"use client";

import { looksLikeAssetPath } from "@/lib/fieldType";
import type { Session } from "@/lib/adminApi";
import { labelFor } from "./labels";
import AssetEditor from "./AssetEditor";
import { inputClass, type FieldEditorProps, type OnChange, type Path } from "./types";

const removeButtonClass =
  "rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 hover:border-red-300 hover:text-red-600";
const addButtonClass = "mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isScalarValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * Edytor dla type:"table" — jeden komponent obsługujący trzy realne kształty
 * "wartości tabelarycznej" spotykane w treści (patrz src/lib/fieldType.ts::
 * classifyFieldType, który klasyfikuje wszystkie trzy jako "table", bo żaden
 * z pozostałych czterech typów nie pasuje lepiej):
 *   1) lista prostych wartości (np. zakładki menu) -> jedna kolumna,
 *   2) lista płaskich obiektów (apartamenty, wiersze cen, galeria, ...) ->
 *      wielokolumnowa tabela, kolumny wykrywane w locie (nie zapisywane),
 *   3) płaski słownik klucz/wartość (errors, consents, ...) -> stałe wiersze
 *      klucz/wartość, bez dodawania/usuwania (klucze są odczytywane po
 *      nazwie w kodzie, np. errors.emailRequired w Contact).
 */
export default function TableEditor({ value, path, session, onChange, meta }: FieldEditorProps) {
  if (isPlainObject(value)) {
    return <DictTable value={value} path={path} session={session} onChange={onChange} />;
  }

  const rows = Array.isArray(value) ? value : [];
  const isObjectRows = rows.length > 0 && rows.every(isPlainObject);

  if (isObjectRows) {
    return (
      <ObjectRowsTable
        rows={rows as Record<string, unknown>[]}
        path={path}
        session={session}
        onChange={onChange}
        columnLabels={meta?.columnLabels}
      />
    );
  }

  return <PrimitiveRowsTable rows={rows} path={path} onChange={onChange} />;
}

// --- Kształt 1: lista prostych wartości --------------------------------------

function PrimitiveRowsTable({ rows, path, onChange }: { rows: unknown[]; path: Path; onChange: OnChange }) {
  function handleChange(index: number, raw: string, wasNumber: boolean) {
    const next = [...rows];
    next[index] = wasNumber ? Number(raw) || 0 : raw;
    onChange(path, next);
  }

  function handleRemove(index: number) {
    onChange(path, rows.filter((_, i) => i !== index));
  }

  function handleAdd() {
    const templateIsNumber = typeof rows[0] === "number";
    onChange(path, [...rows, templateIsNumber ? 0 : ""]);
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((cell, index) => {
              const wasNumber = typeof cell === "number";
              return (
                <tr key={index} className="border-b border-zinc-100 last:border-b-0">
                  <td className="px-2 py-1.5">
                    <input
                      type={wasNumber ? "number" : "text"}
                      value={String(cell ?? "")}
                      onChange={(event) => handleChange(index, event.target.value, wasNumber)}
                      className={`${inputClass} min-w-[10rem]`}
                    />
                  </td>
                  <td className="w-px px-2 py-1.5">
                    <button type="button" onClick={() => handleRemove(index)} className={removeButtonClass}>
                      Usuń
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={handleAdd} className={addButtonClass}>
        + Dodaj wiersz
      </button>
    </div>
  );
}

// --- Kształt 2: lista płaskich obiektów --------------------------------------

type ColumnKind = "asset" | "assetList" | "number" | "text";

function collectColumns(rows: Record<string, unknown>[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

/** Wykrywane w locie z aktualnych wartości — nic z tego nie jest zapisywane osobno, patrz komentarz nad TableEditor. */
function detectColumnKind(rows: Record<string, unknown>[], key: string): ColumnKind {
  const values = rows.map((row) => row[key]);

  if (values.some((v) => Array.isArray(v))) return "assetList";

  const nonEmpty = values.filter((v) => v !== "" && v !== undefined && v !== null);
  if (nonEmpty.length > 0 && nonEmpty.every((v) => typeof v === "string" && looksLikeAssetPath(v))) {
    return "asset";
  }
  if (nonEmpty.length > 0 && nonEmpty.every((v) => typeof v === "number")) {
    return "number";
  }
  return "text";
}

function AssetListCell({
  label,
  urls,
  path,
  session,
  onChange,
}: {
  label: string;
  urls: unknown[];
  path: Path;
  session: Session | null;
  onChange: OnChange;
}) {
  const list = urls.filter((u): u is string => typeof u === "string");

  function handleAdd() {
    onChange(path, [...list, ""]);
  }

  function handleRemove(index: number) {
    onChange(path, list.filter((_, i) => i !== index));
  }

  return (
    <div className="min-w-[12rem] space-y-2">
      {list.map((url, index) => (
        <div key={index} className="flex items-start gap-1">
          <div className="flex-1">
            <AssetEditor
              label={`${label} ${index + 1}`}
              name={`${label}[${index}]`}
              value={url}
              path={[...path, index]}
              session={session}
              onChange={onChange}
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="mt-1 text-xs text-zinc-400 hover:text-red-600"
            aria-label="Usuń zdjęcie"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={handleAdd} className="text-xs font-medium text-zinc-500 hover:text-zinc-800">
        + Dodaj zdjęcie
      </button>
    </div>
  );
}

function ObjectRowsTable({
  rows,
  path,
  session,
  onChange,
  columnLabels,
}: {
  rows: Record<string, unknown>[];
  path: Path;
  session: Session | null;
  onChange: OnChange;
  columnLabels?: Record<string, string>;
}) {
  const columns = collectColumns(rows);
  const columnKinds = Object.fromEntries(columns.map((key) => [key, detectColumnKind(rows, key)])) as Record<
    string,
    ColumnKind
  >;

  function handleCellChange(rowIndex: number, key: string, raw: string, kind: ColumnKind) {
    onChange([...path, rowIndex, key], kind === "number" ? Number(raw) || 0 : raw);
  }

  function handleRemoveRow(rowIndex: number) {
    onChange(path, rows.filter((_, i) => i !== rowIndex));
  }

  function handleAddRow() {
    const blank = Object.fromEntries(
      columns.map((key) => {
        const kind = columnKinds[key];
        if (kind === "number") return [key, 0];
        if (kind === "assetList") return [key, []];
        return [key, ""];
      })
    );
    onChange(path, [...rows, blank]);
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              {columns.map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600"
                >
                  {columnLabels?.[key] ?? labelFor(key)}
                </th>
              ))}
              <th className="border-b border-zinc-200 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-zinc-100 align-top last:border-b-0">
                {columns.map((key) => {
                  const kind = columnKinds[key];
                  const cellValue = row[key];
                  const cellLabel = columnLabels?.[key] ?? labelFor(key);

                  if (kind === "assetList") {
                    return (
                      <td key={key} className="px-2 py-1.5">
                        <AssetListCell
                          label={cellLabel}
                          urls={Array.isArray(cellValue) ? cellValue : []}
                          path={[...path, rowIndex, key]}
                          session={session}
                          onChange={onChange}
                        />
                      </td>
                    );
                  }

                  if (kind === "asset") {
                    return (
                      <td key={key} className="px-2 py-1.5">
                        <AssetEditor
                          label={cellLabel}
                          name={key}
                          value={typeof cellValue === "string" ? cellValue : ""}
                          path={[...path, rowIndex, key]}
                          session={session}
                          onChange={onChange}
                        />
                      </td>
                    );
                  }

                  return (
                    <td key={key} className="px-2 py-1.5">
                      <input
                        aria-label={cellLabel}
                        type={kind === "number" ? "number" : "text"}
                        value={String(cellValue ?? "")}
                        onChange={(event) => handleCellChange(rowIndex, key, event.target.value, kind)}
                        className={`${inputClass} min-w-[8rem]`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <button type="button" onClick={() => handleRemoveRow(rowIndex)} className={removeButtonClass}>
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={handleAddRow} className={addButtonClass}>
        + Dodaj wiersz
      </button>
    </div>
  );
}

// --- Kształt 3: płaski słownik klucz/wartość ---------------------------------

function DictTable({
  value,
  path,
  session,
  onChange,
}: {
  value: Record<string, unknown>;
  path: Path;
  session: Session | null;
  onChange: OnChange;
}) {
  void session; // słownikowe wartości są dziś zawsze tekstowe (errors/placeholders/consents) — brak assetów do przesłania

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {Object.entries(value).map(([key, val]) => {
            if (isScalarValue(val)) {
              return (
                <tr key={key} className="border-b border-zinc-100 last:border-b-0">
                  <td className="w-1/3 px-2 py-1.5 align-middle">
                    <code className="text-xs text-zinc-400">{key}</code>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={String(val ?? "")}
                      onChange={(event) => onChange([...path, key], event.target.value)}
                      className={inputClass}
                    />
                  </td>
                </tr>
              );
            }

            if (isPlainObject(val)) {
              return Object.entries(val).map(([innerKey, innerVal]) => (
                <tr key={`${key}.${innerKey}`} className="border-b border-zinc-100 last:border-b-0">
                  <td className="w-1/3 px-2 py-1.5 align-middle">
                    <code className="text-xs text-zinc-400">
                      {key}.{innerKey}
                    </code>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={String(innerVal ?? "")}
                      onChange={(event) => onChange([...path, key, innerKey], event.target.value)}
                      className={inputClass}
                    />
                  </td>
                </tr>
              ));
            }

            return null;
          })}
        </tbody>
      </table>
    </div>
  );
}
