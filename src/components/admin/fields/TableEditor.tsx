"use client";

import { useRef, useState, type DragEvent } from "react";
import { looksLikeAssetKey, looksLikeAssetPath } from "@/lib/fieldType";
import type { Session } from "@/lib/adminApi";
import { labelFor } from "./labels";
import AssetEditor from "./AssetEditor";
import LibraryButton from "../assets/LibraryButton";
import RowDetailsDialog from "./RowDetailsDialog";
import PlanEditorDialog from "./PlanEditorDialog";
import { detailHiddenKeys, detailOwnedKeys, detailsSummary, resolveRowDetails } from "./rowDetails";
import { useSheet, type CellWrite } from "./useSheet";
import { inputClass, type FieldEditorProps, type OnChange, type Path } from "./types";

const removeButtonClass =
  "rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600";
const addButtonClass =
  "mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700";
const bulkButtonClass =
  "rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isScalarValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * Zaznaczenie wierszy do akcji masowych — czysto lokalny stan UI (nie
 * zapisywany, resetuje się np. przy odświeżeniu panelu). Czyścimy je
 * automatycznie, gdy zmieni się LICZBA wierszy (dodanie/usunięcie, masowe albo
 * pojedyncze) — same indeksy po takiej zmianie wskazywałyby na inne wiersze,
 * więc trzymanie starego zaznaczenia byłoby mylące. Edycja komórki nie zmienia
 * długości `rows`, więc zaznaczenie przeżywa zwykłe wpisywanie tekstu.
 */
function useRowSelection(rowCount: number) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Wzorzec "dopasuj stan podczas renderu" z dokumentacji Reacta — zamiast
  // useEffect (który powodowałby dodatkowy, kaskadowy render po commicie),
  // porównanie i ewentualny setState dzieją się w trakcie tego samego renderu.
  const [prevRowCount, setPrevRowCount] = useState(rowCount);
  if (rowCount !== prevRowCount) {
    setPrevRowCount(rowCount);
    setSelected(new Set());
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rowCount ? new Set() : new Set(Array.from({ length: rowCount }, (_, i) => i))
    );
  }

  function clear() {
    setSelected(new Set());
  }

  /** Po zmianie kolejności (ta sama liczba wierszy): order[nowyIndeks] = staryIndeks — zaznaczenie jedzie razem z wierszami. */
  function remap(order: number[]) {
    setSelected((prev) => new Set(order.flatMap((oldIndex, newIndex) => (prev.has(oldIndex) ? [newIndex] : []))));
  }

  function selectWhere(indices: number[], additive: boolean) {
    setSelected((prev) => new Set([...(additive ? prev : []), ...indices]));
  }

  return { selected, toggle, toggleAll, clear, remap, selectWhere, isAllSelected: rowCount > 0 && selected.size === rowCount };
}

// --- Kolejność i klonowanie wierszy (wspólne dla list wartości i list obiektów) ---

/** Przenosi element z `from` na pozycję `to`; zwraca nową tablicę i permutację (order[nowy] = stary). */
function moveRow<T>(items: T[], from: number, to: number): { next: T[]; order: number[] } {
  const order = items.map((_, index) => index);
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  return { next: order.map((index) => items[index]), order };
}

/** Zaznaczone wiersze (w dotychczasowej kolejności) na początek albo koniec listy. */
function moveSelected<T>(items: T[], selected: Set<number>, where: "top" | "bottom"): { next: T[]; order: number[] } {
  const picked = items.map((_, index) => index).filter((index) => selected.has(index));
  const rest = items.map((_, index) => index).filter((index) => !selected.has(index));
  const order = where === "top" ? [...picked, ...rest] : [...rest, ...picked];
  return { next: order.map((index) => items[index]), order };
}

/** Kopia każdego zaznaczonego wiersza ląduje zaraz pod oryginałem. */
function duplicateRows<T>(items: T[], indices: Set<number>): T[] {
  return items.flatMap((item, index) => (indices.has(index) ? [item, structuredClone(item)] : [item]));
}

/**
 * Przeciąganie wierszy za uchwyt (⠿). Wiersz jest "draggable" tylko, gdy kursor
 * wciśnięto na uchwycie — inaczej nie dałoby się zaznaczać tekstu w polach.
 */
function useRowDrag(onMove: (from: number, to: number) => void) {
  const [armed, setArmed] = useState<number | null>(null);
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function reset() {
    setArmed(null);
    setFrom(null);
    setOver(null);
  }

  return {
    over: from !== null ? over : null,
    handleProps: (index: number) => ({
      onMouseDown: () => setArmed(index),
      onMouseUp: () => setArmed(null),
    }),
    rowProps: (index: number) => ({
      draggable: armed === index,
      onDragStart: (event: DragEvent) => {
        setFrom(index);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      },
      onDragOver: (event: DragEvent) => {
        if (from === null) return;
        event.preventDefault();
        setOver(index);
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        if (from !== null && from !== index) onMove(from, index);
        reset();
      },
      onDragEnd: reset,
    }),
  };
}

const rowIconButtonClass =
  "grid h-7 w-7 place-items-center rounded-lg border border-zinc-200 bg-white text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 disabled:opacity-30 disabled:hover:border-zinc-200 disabled:hover:text-zinc-500";

/** Uchwyt do przeciągania + strzałki w pierwszej kolumnie wiersza. */
function RowOrderCell({
  index,
  count,
  onMove,
  handleProps,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  handleProps: { onMouseDown: () => void; onMouseUp: () => void };
}) {
  return (
    <div className="flex items-center gap-1">
      <span
        {...handleProps}
        title="Przeciągnij, aby zmienić kolejność"
        aria-hidden
        className="cursor-grab select-none px-0.5 text-base leading-none text-zinc-400 hover:text-zinc-700 active:cursor-grabbing"
      >
        ⠿
      </span>
      <div className="flex flex-col">
        <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} aria-label={`Przesuń wiersz ${index + 1} w górę`} className="px-1 text-[10px] leading-none text-zinc-400 hover:text-zinc-800 disabled:opacity-25">
          ▲
        </button>
        <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === count - 1} aria-label={`Przesuń wiersz ${index + 1} w dół`} className="px-1 text-[10px] leading-none text-zinc-400 hover:text-zinc-800 disabled:opacity-25">
          ▼
        </button>
      </div>
      <span className="w-5 text-right text-[11px] tabular-nums text-zinc-400">{index + 1}</span>
    </div>
  );
}

/** Duplikuj + Usuń w ostatniej kolumnie wiersza. */
function RowActionsCell({ index, onDuplicate, onRemove }: { index: number; onDuplicate: () => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onDuplicate} title="Duplikuj wiersz (kopia pod spodem)" aria-label={`Duplikuj wiersz ${index + 1}`} className={rowIconButtonClass}>
        ⧉
      </button>
      <button type="button" onClick={onRemove} className={removeButtonClass}>
        Usuń
      </button>
    </div>
  );
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
 *
 * Pole z "details" (meta.rowDetails — preset albo opis, patrz rowDetails.ts) dostaje w każdym
 * wierszu komórkę "Więcej" z oknem RowDetailsDialog.tsx; klucze edytowane tylko w oknie znikają
 * z tabeli, a komórka kopiuje się w arkuszu razem z nimi (Ctrl+C/V, ■, Ctrl+D).
 *
 * Kolumny tekstowe i liczbowe listy obiektów działają jak arkusz — patrz useSheet.ts.
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
        rowDetails={meta?.rowDetails}
        siblings={meta?.siblings}
      />
    );
  }

  return <PrimitiveRowsTable rows={rows} path={path} session={session} onChange={onChange} />;
}

// --- Kształt 1: lista prostych wartości --------------------------------------

function PrimitiveRowsTable({ rows, path, session, onChange }: { rows: unknown[]; path: Path; session: Session | null; onChange: OnChange }) {
  // Lista ścieżek do zdjęć (np. slider w /wykonczenie-pod-klucz) — każdy wiersz dostaje podgląd i upload zamiast gołego pola tekstowego.
  const isAssetList = rows.some((cell) => typeof cell === "string" && cell !== "" && looksLikeAssetPath(cell));
  const { selected, toggle, toggleAll, clear, remap, isAllSelected } = useRowSelection(rows.length);
  const [bulkValue, setBulkValue] = useState("");

  function handleMove(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    const { next, order } = moveRow(rows, from, to);
    onChange(path, next);
    remap(order);
  }

  function handleMoveSelected(where: "top" | "bottom") {
    const { next, order } = moveSelected(rows, selected, where);
    onChange(path, next);
    remap(order);
  }

  const drag = useRowDrag(handleMove);

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

  function handleBulkDelete() {
    onChange(path, rows.filter((_, i) => !selected.has(i)));
    clear();
  }

  function handleBulkSet() {
    const wasNumber = typeof rows[0] === "number";
    const value: unknown = wasNumber ? Number(bulkValue) || 0 : bulkValue;
    onChange(
      path,
      rows.map((cell, i) => (selected.has(i) ? value : cell))
    );
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 text-sm">
          <span className="font-medium text-zinc-700">Zaznaczono: {selected.size}</span>
          <button type="button" onClick={() => onChange(path, duplicateRows(rows, selected))} className={bulkButtonClass}>
            Duplikuj zaznaczone
          </button>
          <button type="button" onClick={() => handleMoveSelected("top")} className={bulkButtonClass}>
            Na górę
          </button>
          <button type="button" onClick={() => handleMoveSelected("bottom")} className={bulkButtonClass}>
            Na dół
          </button>
          <button type="button" onClick={handleBulkDelete} className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50">
            Usuń zaznaczone
          </button>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              placeholder="Nowa wartość"
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs"
            />
            <button type="button" onClick={handleBulkSet} className={bulkButtonClass}>
              Zastosuj do zaznaczonych
            </button>
          </div>
          <button type="button" onClick={clear} className="ml-auto text-xs text-zinc-500 hover:text-zinc-800">
            Odznacz wszystko
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50/80">
              <th className="w-8 border-b border-zinc-200 px-2 py-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  aria-label="Zaznacz wszystkie wiersze"
                />
              </th>
              <th className="w-px border-b border-zinc-200 px-2 py-2" />
              <th className="border-b border-zinc-200 px-2 py-2" />
              <th className="border-b border-zinc-200 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((cell, index) => {
              const wasNumber = typeof cell === "number";
              return (
                <tr
                  key={index}
                  {...drag.rowProps(index)}
                  className={`border-b border-zinc-100 last:border-b-0 ${selected.has(index) ? "bg-blue-50" : ""} ${drag.over === index ? "outline outline-2 -outline-offset-2 outline-blue-400" : ""}`}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(index)}
                      onChange={() => toggle(index)}
                      aria-label={`Zaznacz wiersz ${index + 1}`}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <RowOrderCell index={index} count={rows.length} onMove={handleMove} handleProps={drag.handleProps(index)} />
                  </td>
                  <td className="px-2 py-1.5">
                    {isAssetList ? (
                      <AssetEditor
                        label={`Zdjęcie ${index + 1}`}
                        name={`zdjecie-${index + 1}`}
                        value={String(cell ?? "")}
                        path={[...path, index]}
                        session={session}
                        onChange={(_, uploaded) => handleChange(index, String(uploaded), false)}
                      />
                    ) : (
                      <input
                        type={wasNumber ? "number" : "text"}
                        value={String(cell ?? "")}
                        onChange={(event) => handleChange(index, event.target.value, wasNumber)}
                        className={`${inputClass} min-w-[10rem]`}
                      />
                    )}
                  </td>
                  <td className="w-px px-2 py-1.5">
                    <RowActionsCell index={index} onDuplicate={() => onChange(path, duplicateRows(rows, new Set([index])))} onRemove={() => handleRemove(index)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleAdd} className={addButtonClass}>
          + Dodaj wiersz
        </button>
        {isAssetList && <LibraryButton session={session} accept="image" className="mt-3" onPickMany={(urls) => onChange(path, [...rows.filter((cell) => cell !== ""), ...urls])} />}
      </div>
    </div>
  );
}

// --- Kształt 2: lista płaskich obiektów --------------------------------------

type ColumnKind = "asset" | "assetList" | "number" | "text";

/**
 * Awaryjne źródło kolejności kolumn, gdy nie ma sąsiedniego pola "columns"
 * (patrz resolveColumnOrder) — kolejność kluczy pierwszego wystąpienia w
 * wierszach. UWAGA: MySQL nie gwarantuje zachowania kolejności kluczy obiektu
 * JSON przy zapisie/odczycie (wewnętrznie sortuje je wg długości klucza, potem
 * leksykograficznie) — Object.keys(row) po przejściu przez bazę może więc
 * wyjść w innej kolejności niż ta, w jakiej wiersz został zapisany. Tablice
 * (jak "columns" poniżej) NIE mają tego problemu — dlatego resolveColumnOrder
 * zawsze woli "columns", jeśli jest dostępne.
 */
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

/**
 * Kolejność kolumn MUSI pochodzić z sąsiedniego pola "columns" (tablicy —
 * kolejność elementów tablicy MySQL zawsze zachowuje), gdy tylko jest
 * dostępne — to jedyne odporne na powyższą wadę MySQL-a źródło prawdy o
 * kolejności. `columnLabels` to Record zbudowany W PRZEGLĄDARCE (patrz
 * extractColumnLabels w EditableField.tsx) przez iterację TEJ tablicy, więc
 * Object.keys(columnLabels) wiernie odtwarza jej kolejność. Dowolny klucz
 * obecny w wierszach, ale nieopisany w "columns" (niespójność danych),
 * dokleja się na końcu — żeby nic nie znikało po cichu.
 */
function resolveColumnOrder(rows: Record<string, unknown>[], columnLabels?: Record<string, string>): string[] {
  if (!columnLabels) return collectColumns(rows);

  const fromColumnsField = Object.keys(columnLabels);
  const extra = collectColumns(rows).filter((key) => !fromColumnsField.includes(key));
  return [...fromColumnsField, ...extra];
}

/** Wykrywane w locie z aktualnych wartości — nic z tego nie jest zapisywane osobno, patrz komentarz nad TableEditor. */
function detectColumnKind(rows: Record<string, unknown>[], key: string): ColumnKind {
  const values = rows.map((row) => row[key]);

  if (values.some((v) => Array.isArray(v))) return "assetList";

  const nonEmpty = values.filter((v) => v !== "" && v !== undefined && v !== null);
  if (nonEmpty.length > 0 && nonEmpty.every((v) => typeof v === "string" && looksLikeAssetPath(v))) {
    return "asset";
  }
  // Kolumna bez żadnego zdjęcia (np. "image" w nowej tabeli) — poznajemy po nazwie, żeby był przycisk uploadu.
  if (nonEmpty.length === 0 && looksLikeAssetKey(key)) {
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={handleAdd} className="text-xs font-medium text-zinc-500 hover:text-zinc-800">
          + Dodaj zdjęcie
        </button>
        <LibraryButton session={session} accept="image" onPickMany={(urls) => onChange(path, [...list.filter(Boolean), ...urls])} />
      </div>
    </div>
  );
}

/** Tekstowa postać komórki do porównań i podpowiedzi ("Willa", "11500", ...). */
function cellText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** Różne wartości kolumny z liczbą wystąpień, najczęstsze pierwsze — do podpowiedzi i szybkiego zaznaczania. */
function distinctValues(rows: Record<string, unknown>[], key: string, only?: Set<number>): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  rows.forEach((row, index) => {
    if (only && !only.has(index)) return;
    const text = cellText(row[key]);
    counts.set(text, (counts.get(text) ?? 0) + 1);
  });
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, "pl", { numeric: true }));
}

/** Kolumny, po których da się sensownie zaznaczać (powtarzające się wartości, np. typ, status, strefa). */
function groupableColumns(rows: Record<string, unknown>[], columns: string[], columnKinds: Record<string, ColumnKind>): string[] {
  return columns.filter((key) => {
    if (columnKinds[key] === "assetList" || columnKinds[key] === "asset") return false;
    const distinct = distinctValues(rows, key);
    return distinct.length > 1 && distinct.length < rows.length && distinct.every((entry) => entry.value.length <= 60);
  });
}

/**
 * "Zaznacz wiersze, gdzie <kolumna> = <wartość>" — szybkie zaznaczenie grupy wierszy
 * (np. wszystkie wille, wszystkie "Dostępny") przed edycją wielu wierszy naraz.
 */
function QuickSelect({
  rows,
  columns,
  columnLabels,
  onSelect,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
  columnLabels?: Record<string, string>;
  onSelect: (indices: number[], additive: boolean) => void;
}) {
  const [key, setKey] = useState(columns[0] ?? "");
  const activeKey = columns.includes(key) ? key : (columns[0] ?? "");
  const options = activeKey ? distinctValues(rows, activeKey) : [];
  const [value, setValue] = useState("");
  const activeValue = options.some((option) => option.value === value) ? value : (options[0]?.value ?? "");

  if (columns.length === 0) return null;

  const matching = rows.flatMap((row, index) => (cellText(row[activeKey]) === activeValue ? [index] : []));

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
      <span>Zaznacz wiersze, gdzie</span>
      <select value={activeKey} onChange={(event) => setKey(event.target.value)} className="rounded-md border border-zinc-300 bg-white px-2 py-1" aria-label="Kolumna do zaznaczania">
        {columns.map((column) => (
          <option key={column} value={column}>
            {columnLabels?.[column] ?? labelFor(column)}
          </option>
        ))}
      </select>
      <span>=</span>
      <select value={activeValue} onChange={(event) => setValue(event.target.value)} className="max-w-[16rem] rounded-md border border-zinc-300 bg-white px-2 py-1" aria-label="Wartość do zaznaczania">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.value === "" ? "(puste)" : option.value} ({option.count})
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onSelect(matching, false)} className={bulkButtonClass}>
        Zaznacz ({matching.length})
      </button>
      <button type="button" onClick={() => onSelect(matching, true)} className={bulkButtonClass} title="Dodaj do obecnego zaznaczenia">
        + Dodaj do zaznaczenia
      </button>
    </div>
  );
}

/**
 * Pasek akcji masowych dla ObjectRowsTable — widoczny tylko, gdy coś jest
 * zaznaczone: duplikowanie, przenoszenie na górę/dół, usuwanie oraz zmiana
 * wartości jednej kolumny we wszystkich zaznaczonych wierszach naraz (z
 * podpowiedzią istniejących wartości; dla zdjęć — upload). Kolumny typu
 * "assetList" są wykluczone z masowej zmiany — pojedyncze pole nie zastąpi
 * listy plików.
 */
function BulkToolbar({
  rows,
  selected,
  columns,
  columnLabels,
  columnKinds,
  session,
  onBulkDelete,
  onBulkSet,
  onDuplicate,
  onMoveSelected,
  onClear,
}: {
  rows: Record<string, unknown>[];
  selected: Set<number>;
  columns: string[];
  columnLabels?: Record<string, string>;
  columnKinds: Record<string, ColumnKind>;
  session: Session | null;
  onBulkDelete: () => void;
  onBulkSet: (key: string, value: string) => void;
  onDuplicate: () => void;
  onMoveSelected: (where: "top" | "bottom") => void;
  onClear: () => void;
}) {
  const editableColumns = columns.filter((key) => columnKinds[key] !== "assetList");
  const [bulkKey, setBulkKey] = useState(editableColumns[0] ?? "");
  const [bulkValue, setBulkValue] = useState("");

  if (selected.size === 0) return null;

  const activeKey = editableColumns.includes(bulkKey) ? bulkKey : (editableColumns[0] ?? "");
  const kind = columnKinds[activeKey];
  const label = (key: string) => columnLabels?.[key] ?? labelFor(key);
  const current = activeKey ? distinctValues(rows, activeKey, selected) : [];
  const suggestions = activeKey ? distinctValues(rows, activeKey).filter((entry) => entry.value !== "").slice(0, 40) : [];
  const listId = `bulk-values-${activeKey}`;

  return (
    <div className="mb-2 space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-zinc-700">Zaznaczono: {selected.size}</span>
        <button type="button" onClick={onDuplicate} className={bulkButtonClass}>
          Duplikuj zaznaczone
        </button>
        <button type="button" onClick={() => onMoveSelected("top")} className={bulkButtonClass}>
          Na górę
        </button>
        <button type="button" onClick={() => onMoveSelected("bottom")} className={bulkButtonClass}>
          Na dół
        </button>
        <button type="button" onClick={onBulkDelete} className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50">
          Usuń zaznaczone
        </button>
        <button type="button" onClick={onClear} className="ml-auto text-xs text-zinc-500 hover:text-zinc-800">
          Odznacz wszystko
        </button>
      </div>

      {editableColumns.length > 0 && (
        <div className="flex flex-wrap items-start gap-2 border-t border-indigo-200/70 pt-2">
          <span className="pt-1 text-xs font-medium text-zinc-700">Zmień w zaznaczonych:</span>
          <select
            value={activeKey}
            onChange={(event) => {
              setBulkKey(event.target.value);
              setBulkValue("");
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
            aria-label="Kolumna do masowej zmiany"
          >
            {editableColumns.map((key) => (
              <option key={key} value={key}>
                {label(key)}
              </option>
            ))}
          </select>
          <span className="pt-1 text-xs text-zinc-500">na</span>
          {kind === "asset" ? (
            <div className="w-64">
              <AssetEditor label={label(activeKey)} name={`bulk-${activeKey}`} value={bulkValue} path={[]} session={session} onChange={(_, uploaded) => setBulkValue(String(uploaded ?? ""))} />
            </div>
          ) : (
            <>
              <input
                type={kind === "number" ? "number" : "text"}
                list={kind === "number" ? undefined : listId}
                value={bulkValue}
                onChange={(event) => setBulkValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && activeKey) {
                    event.preventDefault();
                    onBulkSet(activeKey, bulkValue);
                  }
                }}
                placeholder="Nowa wartość"
                className="w-56 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
              />
              <datalist id={listId}>
                {suggestions.map((entry) => (
                  <option key={entry.value} value={entry.value} />
                ))}
              </datalist>
            </>
          )}
          <button type="button" onClick={() => activeKey && onBulkSet(activeKey, bulkValue)} className={bulkButtonClass}>
            Zastosuj do {selected.size} {selected.size === 1 ? "wiersza" : "wierszy"}
          </button>
          {current.length > 0 && (
            <span className="basis-full text-[11px] text-zinc-500">
              Obecnie: {current.slice(0, 6).map((entry) => `${entry.value === "" ? "(puste)" : entry.value}${entry.count > 1 ? ` ×${entry.count}` : ""}`).join(" · ")}
              {current.length > 6 ? " …" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ObjectRowsTable({
  rows,
  path,
  session,
  onChange,
  columnLabels,
  rowDetails,
  siblings,
}: {
  rows: Record<string, unknown>[];
  path: Path;
  session: Session | null;
  onChange: OnChange;
  columnLabels?: Record<string, string>;
  rowDetails?: unknown;
  siblings?: Record<string, unknown>;
}) {
  // Okno "Więcej" (rowDetails.ts) — jego pola nie są kolumnami tabeli.
  const details = resolveRowDetails(rowDetails);
  const ownedKeys = details ? detailOwnedKeys(details) : [];
  const [openDetails, setOpenDetails] = useState<number | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const hiddenKeys = details ? detailHiddenKeys(details) : [];
  const columns = resolveColumnOrder(rows, columnLabels).filter((key) => !hiddenKeys.includes(key));
  const columnKinds = Object.fromEntries(columns.map((key) => [key, detectColumnKind(rows, key)])) as Record<
    string,
    ColumnKind
  >;
  const { selected, toggle, toggleAll, clear, remap, selectWhere, isAllSelected } = useRowSelection(rows.length);

  // Arkusz: kolumny tekstowe i liczbowe (zdjęcia i listy plików mają własne edytory w komórce),
  // a na końcu "Więcej" — komórka obiektowa: kopiuje się cała zawartość okna (ownedKeys).
  const sheetColumns = [...columns.filter((key) => columnKinds[key] === "text" || columnKinds[key] === "number"), ...(details ? [DETAILS_COLUMN] : [])];
  const history = useRef<Record<string, unknown>[][]>([]);
  const toCellValue = (key: string, raw: string): unknown =>
    columnKinds[key] === "number" ? Number(raw.replace(/\s/g, "").replace(",", ".")) || 0 : raw;

  function blankRow(): Record<string, unknown> {
    return Object.fromEntries(
      columns.map((key) => {
        const kind = columnKinds[key];
        if (kind === "number") return [key, 0];
        if (kind === "assetList") return [key, []];
        return [key, ""];
      })
    );
  }

  /** Jedna operacja arkusza = jeden zapis i jeden krok cofania (Ctrl+Z). Wklejka dłuższa niż tabela dodaje wiersze. */
  function writeCells(changes: CellWrite[]) {
    if (changes.length === 0) return;
    const next = rows.map((row) => ({ ...row }));
    for (const change of changes) {
      while (next.length <= change.r) next.push(blankRow());
      const key = sheetColumns[change.c];
      if (key === DETAILS_COLUMN) {
        const raw = change.raw as Record<string, unknown> | undefined;
        for (const owned of raw ? ownedKeys : []) {
          if (raw![owned] === undefined) delete next[change.r][owned];
          else next[change.r][owned] = structuredClone(raw![owned]);
        }
        continue;
      }
      next[change.r][key] = toCellValue(key, change.value);
    }
    history.current = [...history.current.slice(-49), rows];
    onChange(path, next);
  }

  const sheet = useSheet({
    rowCount: rows.length,
    colCount: sheetColumns.length,
    getValue: (r, c) => (sheetColumns[c] === DETAILS_COLUMN ? (details && rows[r] ? detailsSummary(details, rows[r]) : "") : cellText(rows[r]?.[sheetColumns[c]])),
    getRaw: (r, c) => (sheetColumns[c] === DETAILS_COLUMN && rows[r] ? Object.fromEntries(ownedKeys.map((key) => [key, rows[r][key]])) : undefined),
    isObjectColumn: (c) => sheetColumns[c] === DETAILS_COLUMN,
    onActivate: (cell) => setOpenDetails(cell.r),
    write: writeCells,
    undo: () => {
      const previous = history.current.pop();
      if (previous) onChange(path, previous);
    },
  });

  /** Pierwsza kolumna ze zdjęciem — "Dodaj wiersze z biblioteki" tworzy wiersz na każdy wybrany plik. */
  const imageColumn = columns.find((key) => columnKinds[key] === "asset");

  function handleRemoveRow(rowIndex: number) {
    onChange(path, rows.filter((_, i) => i !== rowIndex));
  }

  function handleAddRow() {
    onChange(path, [...rows, blankRow()]);
  }

  function handleMove(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    const { next, order } = moveRow(rows, from, to);
    onChange(path, next);
    remap(order);
  }

  function handleMoveSelected(where: "top" | "bottom") {
    const { next, order } = moveSelected(rows, selected, where);
    onChange(path, next);
    remap(order);
  }

  const drag = useRowDrag(handleMove);

  function handleBulkDelete() {
    onChange(path, rows.filter((_, i) => !selected.has(i)));
    clear();
  }

  function handleBulkSet(key: string, raw: string) {
    const kind = columnKinds[key];
    const value: unknown = kind === "number" ? Number(raw) || 0 : raw;
    onChange(
      path,
      rows.map((row, i) => (selected.has(i) ? { ...row, [key]: value } : row))
    );
  }

  return (
    <div>
      {rows.length > 2 && (
        <QuickSelect rows={rows} columns={groupableColumns(rows, columns, columnKinds)} columnLabels={columnLabels} onSelect={selectWhere} />
      )}
      <BulkToolbar
        rows={rows}
        selected={selected}
        columns={columns}
        columnLabels={columnLabels}
        columnKinds={columnKinds}
        session={session}
        onBulkDelete={handleBulkDelete}
        onBulkSet={handleBulkSet}
        onDuplicate={() => onChange(path, duplicateRows(rows, selected))}
        onMoveSelected={handleMoveSelected}
        onClear={clear}
      />
      {details?.plan && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2.5">
          <button type="button" onClick={() => setPlanOpen(true)} className={bulkButtonClass}>
            {details.plan.label ?? "Obrysy na planie"}
          </button>
          <span className="text-xs text-zinc-500">
            Zaznaczanie lokali na zdjęciu planu: rysowanie nowych obrysów i poprawianie punktów · obrys ma{" "}
            {rows.filter((row) => cellText(row[details.plan!.key]).trim() !== "").length} z {rows.length}
          </span>
        </div>
      )}
      {details?.plan && planOpen && (
        <PlanEditorDialog config={details.plan} rows={rows} siblings={siblings ?? {}} onSet={(index, polygon) => onChange([...path, index, details.plan!.key], polygon)} onClose={() => setPlanOpen(false)} />
      )}
      {sheetColumns.length > 0 && (
        <p className="mb-1.5 text-[11px] leading-relaxed text-zinc-400">
          Jak w Excelu: kliknij komórkę i pisz · przeciągnij / Shift = zakres · <kbd>Ctrl+C</kbd> <kbd>Ctrl+X</kbd> <kbd>Ctrl+V</kbd> (także z Excela) · <kbd>Delete</kbd> czyści ·{" "}
          <kbd>Ctrl+D</kbd> wypełnia w dół · <span className="text-indigo-500">■</span> w rogu zaznaczenia przeciągnij, by skopiować · <kbd>Ctrl+Z</kbd> cofa
        </p>
      )}
      <div {...sheet.containerProps} className="overflow-x-auto rounded-lg border border-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/20">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50/80">
              <th className="w-8 border-b border-zinc-200 px-2 py-2">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAll}
                  aria-label="Zaznacz wszystkie wiersze"
                />
              </th>
              <th className="w-px border-b border-zinc-200 px-1 py-2" />
              {columns.map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600"
                >
                  {columnLabels?.[key] ?? labelFor(key)}
                </th>
              ))}
              {details && <th className="whitespace-nowrap border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600">{details.column ?? "Szczegóły"}</th>}
              <th className="border-b border-zinc-200 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                {...drag.rowProps(rowIndex)}
                className={`border-b border-zinc-100 align-top last:border-b-0 ${selected.has(rowIndex) ? "bg-blue-50" : ""} ${
                  drag.over === rowIndex ? "outline outline-2 -outline-offset-2 outline-blue-400" : ""
                }`}
              >
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(rowIndex)}
                    onChange={() => toggle(rowIndex)}
                    aria-label={`Zaznacz wiersz ${rowIndex + 1}`}
                  />
                </td>
                <td className="px-1 py-1.5">
                  <RowOrderCell index={rowIndex} count={rows.length} onMove={handleMove} handleProps={drag.handleProps(rowIndex)} />
                </td>
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

                  const text = cellText(cellValue);
                  const state = sheet.cell(rowIndex, sheetColumns.indexOf(key));
                  return (
                    <td
                      key={key}
                      {...state.props}
                      className={`relative min-w-[8rem] max-w-[18rem] cursor-cell select-none border-l border-zinc-100 p-0 align-middle ${
                        state.inRange ? "bg-indigo-50/80" : state.inFill ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      {state.isEditing && sheet.editorProps && (
                        <input
                          {...sheet.editorProps}
                          aria-label={cellLabel}
                          inputMode={kind === "number" ? "decimal" : undefined}
                          className="absolute inset-0 z-10 h-full w-full border-0 bg-white px-2.5 text-sm text-zinc-900 shadow-lg outline-none ring-2 ring-inset ring-indigo-500"
                        />
                      )}
                      <div title={text} className={`truncate px-2.5 py-2 text-sm text-zinc-800 ${kind === "number" ? "text-right tabular-nums" : ""} ${state.isEditing ? "invisible" : ""}`}>
                        {text || "\u00a0"}
                      </div>
                      <SheetCellChrome state={state} handleProps={sheet.handleProps} />
                    </td>
                  );
                })}
                {details &&
                  (() => {
                    const state = sheet.cell(rowIndex, sheetColumns.length - 1);
                    const summary = detailsSummary(details, row);
                    return (
                      <td
                        {...state.props}
                        className={`relative cursor-cell select-none border-l border-zinc-100 p-0 align-middle ${state.inRange ? "bg-indigo-50/80" : state.inFill ? "bg-indigo-50/40" : ""}`}
                      >
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <button
                            type="button"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={() => setOpenDetails(rowIndex)}
                            className="shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
                          >
                            {details.button ?? "Więcej"}
                          </button>
                          <span title={summary} className="max-w-[12rem] truncate text-xs text-zinc-400">
                            {summary || "pusta"}
                          </span>
                        </div>
                        <SheetCellChrome state={state} handleProps={sheet.handleProps} />
                      </td>
                    );
                  })()}
                <td className="px-2 py-1.5">
                  <RowActionsCell index={rowIndex} onDuplicate={() => onChange(path, duplicateRows(rows, new Set([rowIndex])))} onRemove={() => handleRemoveRow(rowIndex)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleAddRow} className={addButtonClass}>
          + Dodaj wiersz
        </button>
        {imageColumn && (
          <LibraryButton
            session={session}
            accept="image"
            className="mt-3"
            label="Dodaj wiersze z biblioteki"
            onPickMany={(urls) => onChange(path, [...rows, ...urls.map((url) => ({ ...blankRow(), [imageColumn]: url }))])}
          />
        )}
      </div>

      {details && openDetails !== null && rows[openDetails] && (
        <RowDetailsDialog
          config={details}
          row={rows[openDetails]}
          rows={rows}
          rowIndex={openDetails}
          siblings={siblings ?? {}}
          session={session}
          onSet={(key, value) => {
            const parts = key.split(".");
            // Kolumna liczbowa zostaje liczbą także po edycji w oknie.
            const numeric = parts.length === 1 && typeof rows[openDetails][key] === "number" && typeof value === "string";
            onChange([...path, openDetails, ...parts], numeric ? toCellValue(key, value as string) : value);
          }}
          onClose={() => setOpenDetails(null)}
        />
      )}
    </div>
  );
}

/** Klucz kolumny "Więcej" w arkuszu — nie koliduje z żadnym kluczem wiersza. */
const DETAILS_COLUMN = "\u0000details";

/** Ramka zaznaczenia, obszar wypełniania i uchwyt ■ komórki arkusza (useSheet.ts). */
function SheetCellChrome({ state, handleProps }: { state: { isFocus: boolean; isEditing: boolean; inFill: boolean; hasHandle: boolean }; handleProps: object }) {
  return (
    <>
      {state.isFocus && !state.isEditing && <span className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-indigo-500" />}
      {state.inFill && <span className="pointer-events-none absolute inset-0 border border-dashed border-indigo-400" />}
      {state.hasHandle && <span {...handleProps} className="absolute -bottom-1 -right-1 z-10 h-2.5 w-2.5 cursor-crosshair border-2 border-white bg-indigo-500" />}
    </>
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
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
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
