"use client";

import { useState } from "react";
import { isEditableValue, type EditableValue } from "@/lib/editable";
import { uploadAsset, type Session } from "@/lib/adminApi";

type Path = (string | number)[];
type OnChange = (path: Path, value: unknown) => void;

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Rozpoznanie pola "obrazkowego" bez osobnego znacznika typu w danych: albo
 * aktualna wartość już wygląda na ścieżkę do obrazu (najpewniejszy sygnał —
 * łapie 1:1 wszystko, co dziś jest w bazie), albo — dla pustych pól — etykieta
 * sugeruje obraz (logo/ikona/zdjęcie/...). Nowa treść może to dodatkowo
 * doprecyzować przez "label" w JSON-ie; tu tylko awaryjna heurystyka.
 */
const ASSET_VALUE_PATTERN = /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?.*)?$/i;
const ASSET_LABEL_HINT = /logo|ikon|zdj[eę]c|obraz|miniatur|thumbnail|photo|image|\bt[łl]o\b|background|avatar|favicon|baner|banner|wizualizacj/i;

function isAssetField(label: string, value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (ASSET_VALUE_PATTERN.test(value)) return true;
  return value === "" && ASSET_LABEL_HINT.test(label);
}

/**
 * Etykiety pól pochodzą przede wszystkim z danych — z pola "label" zapisanego
 * obok "value"/"editable" w JSON-ie (czyli w bazie, edytowalne tak samo jak
 * reszta treści). Słownik poniżej to wyłącznie AWARYJNY fallback dla starszej
 * treści bez "label" — żeby panel nie pokazywał surowych nazw kluczy zanim
 * dane zostaną uzupełnione. Nie dodawaj tu nowych, specyficznych dla projektu
 * pól — właściwe miejsce na nowy podpis to "label" w JSON-ie, nie ten plik.
 */
const FIELD_LABELS: Record<string, string> = {
  title: "Tytuł",
  description: "Opis",
  heading: "Nagłówek",
  lead: "Wprowadzenie",
  eyebrow: "Etykieta nad nagłówkiem",
  seo: "SEO",
  sections: "Sekcje",
  nav: "Nawigacja",
  label: "Etykieta",
  text: "Treść",
  question: "Pytanie",
  answer: "Odpowiedź",
  blocks: "Bloki treści",
  items: "Elementy",
  component: "Typ sekcji",
};

/** Nazwy typów sekcji (pole "component") -> czytelna, polska nazwa. Nieznany typ pokazuje się bez zmian. */
const COMPONENT_LABELS: Record<string, string> = {
  Hero: "Sekcja powitalna",
  RichText: "Blok tekstowy",
  FAQ: "Pytania i odpowiedzi",
};

/** Czysto techniczne klucze-kontenery bez własnego znaczenia dla użytkownika — ich zawartość spłaszcza się bez dodawania niczego do etykiety. */
const TRANSPARENT_KEYS = new Set(["fields"]);

/** "internalId" -> "Internal id" — heurystyka, awaryjna dla kluczy spoza FIELD_LABELS. */
function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? humanizeKey(key);
}

/** Krótka, samodzielna nazwa elementu tablicy (np. sekcji) — z danych ("label" w JSON-ie ma pierwszeństwo), potem z typu komponentu, tytułu albo numeru porządkowego. */
function describeArrayItem(item: unknown, fallback: string): string {
  if (item !== null && typeof item === "object" && !Array.isArray(item) && !isEditableValue(item)) {
    const record = item as Record<string, unknown>;

    if (typeof record.label === "string" && record.label.trim() !== "") {
      return record.label;
    }

    if (typeof record.component === "string") {
      return COMPONENT_LABELS[record.component] ?? record.component;
    }

    if (typeof record.title === "string") return record.title;
  }

  return fallback;
}

/** Nazwa grupy dla pól zagnieżdżonego obiektu — "label" w danych ma pierwszeństwo przed nazwą klucza. */
function groupLabelFor(childKey: string, value: Record<string, unknown>): string {
  if (typeof value.label === "string" && value.label.trim() !== "") {
    return value.label;
  }
  return labelFor(childKey);
}

type FlatField = { label: string; node: EditableValue; path: Path };

/**
 * Zbiera WSZYSTKIE edytowalne pola z dowolnie zagnieżdżonej struktury w jedną
 * płaską listę — bez pudełka w pudełku w pudełku. Kontekst (np. nazwa sekcji)
 * dolicza się do etykiety pola najwyżej RAZ ("Sekcja powitalna – Nagłówek"),
 * nie przy każdym kolejnym poziomie zagnieżdżenia — stąd i tak długie ścieżki
 * w danych dają krótkie, czytelne podpisy.
 */
function collectFields(node: unknown, path: Path, group: string | null, key: string | null): FlatField[] {
  if (isEditableValue(node)) {
    const fieldLabel = node.label && node.label.trim() !== "" ? node.label : key ? labelFor(key) : "Wartość";
    return [{ label: group ? `${group} – ${fieldLabel}` : fieldLabel, node, path }];
  }

  if (Array.isArray(node)) {
    return node.flatMap((item, index) => {
      const itemGroup = describeArrayItem(item, `Element ${index + 1}`);
      return collectFields(item, [...path, index], itemGroup, null);
    });
  }

  if (node !== null && typeof node === "object") {
    return Object.entries(node as Record<string, unknown>).flatMap(([childKey, value]) => {
      if (TRANSPARENT_KEYS.has(childKey)) {
        return collectFields(value, [...path, childKey], group, null);
      }

      const isPlainObject =
        value !== null && typeof value === "object" && !Array.isArray(value) && !isEditableValue(value);
      const nextGroup =
        isPlainObject && group === null ? groupLabelFor(childKey, value as Record<string, unknown>) : group;

      return collectFields(value, [...path, childKey], nextGroup, childKey);
    });
  }

  return [];
}

/** Wejście panelu: zamienia treść strony na płaski formularz — jeden podpisany input pod drugim, bez zagnieżdżeń. */
export default function EditableField({
  node,
  session,
  onChange,
}: {
  node: unknown;
  session: Session | null;
  onChange: OnChange;
}) {
  const fields = collectFields(node, [], null, null);

  if (fields.length === 0) {
    return <p className="text-sm text-zinc-500">Ta strona nie ma pól do edycji.</p>;
  }

  return (
    <div className="divide-y divide-zinc-100">
      {fields.map((field) => (
        <div key={field.path.join(".")} className="py-4 first:pt-0 last:pb-0">
          <EditableControl label={field.label} node={field.node} path={field.path} session={session} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Prosty input dla surowej (niezawiniętej w EditableValue) wartości prymitywnej gdzieś w głębi struktury — cała gałąź jest edytowalna, bo rodzic (EditableValue) już jest. */
function PrimitiveField({
  label,
  value,
  path,
  session,
  onChange,
}: {
  label: string;
  value: unknown;
  path: Path;
  session: Session | null;
  onChange: OnChange;
}) {
  if (isAssetField(label, value)) {
    return <AssetField label={label} value={value} path={path} session={session} onChange={onChange} />;
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} />
        {label}
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-600">{label}</label>
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(path, Number(event.target.value))}
          className={inputClass}
        />
      </div>
    );
  }

  const text = String(value ?? "");
  const multiline = text.length > 80 || text.includes("\n");

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-600">{label}</label>
      {multiline ? (
        <textarea value={text} rows={3} onChange={(event) => onChange(path, event.target.value)} className={inputClass} />
      ) : (
        <input type="text" value={text} onChange={(event) => onChange(path, event.target.value)} className={inputClass} />
      )}
    </div>
  );
}

/**
 * Pole typu "asset" — podgląd + wybór pliku z dysku. Plik leci na serwer
 * (UploadController.php, patrz backend/), a do pola trafia sam URL, który
 * wraca — dokładnie tak samo, jakby ktoś wkleił tam gotową ścieżkę ręcznie
 * (stąd input tekstowy obok zostaje jako awaryjne wyjście). Bez URL-a plik
 * nie renderuje się nigdzie na stronie — sama zawartość binarna nigdy nie
 * trafia do treści strony (bazy).
 */
function AssetField({
  label,
  value,
  path,
  session,
  onChange,
}: {
  label: string;
  value: string;
  path: Path;
  session: Session | null;
  onChange: OnChange;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAsset(file, session);
      onChange(path, url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesłać pliku.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-600">{label}</label>
      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina, nie treść strony
          <img src={value} alt="" className="h-16 w-16 flex-shrink-0 rounded border border-zinc-200 object-cover" />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 text-center text-[10px] text-zinc-400">
            Brak zdjęcia
          </div>
        )}

        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(path, event.target.value)}
            className={inputClass}
            placeholder="/investments/.../plik.webp"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50">
            {uploading ? "Przesyłanie…" : "Wybierz plik…"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleFile(file);
              }}
            />
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/** Wartość pojedynczej komórki tabeli — jedyne typy, jakie TableEditor umie wyświetlić i edytować. */
type CellValue = string | number | boolean;

function isCellValue(value: unknown): value is CellValue {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * Rozpoznaje "tablicę tabelaryczną" — listę obiektów o tych samych kluczach i
 * wyłącznie prostych wartościach (np. wiersze rejestru cen: jeden obiekt =
 * jeden lokal, kolumny = klucze). Taki kształt renderuje się jako prawdziwa
 * tabela HTML zamiast stosu osobnych kart — dużo szybciej się to skanuje i
 * edytuje, gdy wierszy są dziesiątki. Każdy obiekt z zagnieżdżonym
 * obiektem/tablicą (np. apartamenty z "images": []) odpada z tego trybu.
 */
function isTabularArray(value: unknown[]): value is Array<Record<string, CellValue>> {
  if (value.length === 0) return false;

  return value.every((item) => {
    if (!isPlainObject(item) || isEditableValue(item)) return false;
    return Object.values(item).every(isCellValue);
  });
}

/** Kolejność kolumn = kolejność kluczy w pierwszym wierszu, dopełniona kluczami, które pojawiają się dopiero w kolejnych (rzadka niespójność danych). */
function collectColumns(rows: Array<Record<string, CellValue>>): string[] {
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

function TableEditor({
  rows,
  path,
  onChange,
}: {
  rows: Array<Record<string, CellValue>>;
  path: Path;
  onChange: OnChange;
}) {
  const columns = collectColumns(rows);

  function handleCellChange(rowIndex: number, key: string, raw: string, wasNumber: boolean) {
    const value: CellValue = wasNumber ? (Number(raw) || 0) : raw;
    onChange([...path, rowIndex, key], value);
  }

  function handleRemoveRow(rowIndex: number) {
    onChange(path, rows.filter((_, index) => index !== rowIndex));
  }

  function handleAddRow() {
    const blankRow = Object.fromEntries(
      columns.map((key) => [key, typeof rows[0][key] === "number" ? 0 : ""])
    ) as Record<string, CellValue>;
    onChange(path, [...rows, blankRow]);
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50">
              {columns.map((key) => (
                <th key={key} className="border-b border-zinc-200 px-2 py-2 text-left text-xs font-semibold text-zinc-600 whitespace-nowrap">
                  {labelFor(key)}
                </th>
              ))}
              <th className="border-b border-zinc-200 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-zinc-100 last:border-b-0">
                {columns.map((key) => {
                  const cellValue = row[key];
                  const wasNumber = typeof cellValue === "number";
                  return (
                    <td key={key} className="px-2 py-1.5">
                      <input
                        type={wasNumber ? "number" : "text"}
                        value={String(cellValue ?? "")}
                        onChange={(event) => handleCellChange(rowIndex, key, event.target.value, wasNumber)}
                        className={`${inputClass} min-w-[8rem]`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(rowIndex)}
                    className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-500 hover:border-red-300 hover:text-red-600"
                  >
                    Usuń
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={handleAddRow}
        className="mt-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
      >
        + Dodaj wiersz
      </button>
    </div>
  );
}

/**
 * Edytor dla wartości ZŁOŻONEJ (obiekt albo tablica) gdzieś pod EditableValue —
 * np. "cooperationLinks": {value: {investor, land}, editable, label}. Zamiast
 * jednego zepsutego pola tekstowego (dawniej String(node.value) -> "[object
 * Object]"), rozkłada strukturę na osobne, podpisane kontrolki — rekurencyjnie,
 * dowolnie głęboko. Elementy niżej nie mają własnego "editable" — dziedziczą je
 * po najbliższym przodku typu EditableValue (stąd brak tu takiego sprawdzenia).
 */
function CompoundEditor({
  value,
  path,
  session,
  onChange,
}: {
  value: unknown;
  path: Path;
  session: Session | null;
  onChange: OnChange;
}) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-xs italic text-zinc-400">Pusta lista.</p>;
    }

    if (isTabularArray(value)) {
      return <TableEditor rows={value} path={path} onChange={onChange} />;
    }

    const allPrimitive = value.every((item) => typeof item === "string" || typeof item === "number");
    if (allPrimitive) {
      const isNumeric = value.every((item) => typeof item === "number");
      return (
        <textarea
          value={value.join("\n")}
          rows={Math.min(Math.max(value.length, 2), 8)}
          onChange={(event) => {
            const lines = event.target.value.split("\n");
            onChange(
              path,
              isNumeric
                ? lines.map((line) => {
                    const n = Number(line);
                    return Number.isFinite(n) ? n : 0;
                  })
                : lines
            );
          }}
          className={inputClass}
        />
      );
    }

    return (
      <div className="space-y-4">
        {value.map((item, index) => (
          <div key={index} className="rounded-md border border-zinc-200 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {describeArrayItem(item, `Element ${index + 1}`)}
            </div>
            <CompoundEditor value={item} path={[...path, index]} session={session} onChange={onChange} />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    return (
      <div className="space-y-3 border-l-2 border-zinc-100 pl-3">
        {Object.entries(value).map(([key, child]) => {
          const childPath = [...path, key];

          if (isPlainObject(child) || Array.isArray(child)) {
            const childLabel = isPlainObject(child) ? groupLabelFor(key, child) : labelFor(key);
            return (
              <div key={key}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{childLabel}</div>
                <CompoundEditor value={child} path={childPath} session={session} onChange={onChange} />
              </div>
            );
          }

          return <PrimitiveField key={key} label={labelFor(key)} value={child} path={childPath} session={session} onChange={onChange} />;
        })}
      </div>
    );
  }

  // Rzadki brzegowy przypadek (np. tablica mieszająca prymitywy z obiektami) — pojedyncza wartość bez własnej etykiety z kontekstu.
  return <PrimitiveField label="Wartość" value={value} path={path} session={session} onChange={onChange} />;
}

function EditableControl({
  label,
  node,
  path,
  session,
  onChange,
}: {
  label: string;
  node: EditableValue;
  path: Path;
  session: Session | null;
  onChange: OnChange;
}) {
  const valuePath = [...path, "value"];

  if (!node.editable) {
    const preview = isPlainObject(node.value) || Array.isArray(node.value) ? JSON.stringify(node.value) : String(node.value);
    return (
      <div>
        <div className="text-sm font-medium text-zinc-500">{label}</div>
        <div className="mt-1 text-sm text-zinc-400">{preview} · tylko do odczytu</div>
      </div>
    );
  }

  if (isAssetField(label, node.value)) {
    return <AssetField label={label} value={node.value} path={valuePath} session={session} onChange={onChange} />;
  }

  if (isPlainObject(node.value) || Array.isArray(node.value)) {
    return (
      <div>
        <div className="mb-1 block text-sm font-medium">{label}</div>
        <CompoundEditor value={node.value} path={valuePath} session={session} onChange={onChange} />
      </div>
    );
  }

  if (typeof node.value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={node.value} onChange={(event) => onChange(valuePath, event.target.checked)} />
        {label}
      </label>
    );
  }

  if (typeof node.value === "number") {
    return (
      <div>
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
    <div>
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
