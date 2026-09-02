"use client";

import { isEditableValue, type EditableValue } from "@/lib/editable";

type Path = (string | number)[];
type OnChange = (path: Path, value: unknown) => void;

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

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
export default function EditableField({ node, onChange }: { node: unknown; onChange: OnChange }) {
  const fields = collectFields(node, [], null, null);

  if (fields.length === 0) {
    return <p className="text-sm text-zinc-500">Ta strona nie ma pól do edycji.</p>;
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {fields.map((field) => (
        <div key={field.path.join(".")} className="py-4 first:pt-0 last:pb-0">
          <EditableControl label={field.label} node={field.node} path={field.path} onChange={onChange} />
        </div>
      ))}
    </div>
  );
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
      <div>
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">{String(node.value)} · tylko do odczytu</div>
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
