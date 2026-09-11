"use client";

import { hasValidType, isEditableValue, type EditableValue } from "@/lib/editable";
import { classifyFieldType } from "@/lib/fieldType";
import { canRead, canWrite, type Acl } from "@/lib/acl";
import type { Session } from "@/lib/adminApi";
import { describeArrayItem, groupLabelFor, labelFor } from "./fields/labels";
import { fieldEditors } from "./fields/registry";
import type { Path, OnChange } from "./fields/types";

/** Czysto techniczne klucze-kontenery bez własnego znaczenia dla użytkownika — ich zawartość spłaszcza się bez dodawania niczego do etykiety. */
const TRANSPARENT_KEYS = new Set(["fields"]);

type FlatField = {
  /** Kontekst z rodzica (np. nazwa sekcji) — pokazany osobno, NIE jest częścią edytowalnego "label" tego pola. */
  groupPrefix: string | null;
  /** Własny "label" pola — dokładnie to, co jest zapisane w node.label (albo fallback z klucza) — edytowalne. */
  ownLabel: string;
  /** Stabilny techniczny identyfikator pola — klucz obiektu, pod którym pole leży w JSON-ie. Tylko do podglądu. */
  name: string;
  node: EditableValue;
  path: Path;
  /** Dla type:"table" pola "rows" — nagłówki kolumn z sąsiedniego pola "columns" (patrz PriceHistory). */
  columnLabels?: Record<string, string>;
};

/** [{key,label}] (kształt pola "columns") -> {key: label} — do podpowiedzi nagłówków kolumn sąsiedniego pola "rows". */
function extractColumnLabels(value: unknown): Record<string, string> | undefined {
  if (!Array.isArray(value)) return undefined;

  const map: Record<string, string> = {};
  for (const entry of value) {
    if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      if (typeof record.key === "string" && typeof record.label === "string") {
        map[record.key] = record.label;
      }
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

/**
 * Zbiera WSZYSTKIE edytowalne pola z dowolnie zagnieżdżonej struktury w jedną
 * płaską listę — bez pudełka w pudełku w pudełku. Kontekst (np. nazwa sekcji)
 * dolicza się do etykiety pola najwyżej RAZ ("Sekcja powitalna – Nagłówek"),
 * nie przy każdym kolejnym poziomie zagnieżdżenia — stąd i tak długie ścieżki
 * w danych dają krótkie, czytelne podpisy.
 *
 * pageAcl — "acl" CAŁEJ strony (patrz EditableField() niżej) — pole bez
 * WŁASNEGO "acl" dziedziczy je jako domyślne. Bez tego rola z dostępem do
 * strony (np. "blog" do własnego wpisu) nie widziałaby żadnego pola tej
 * strony, bo każde z osobna wciąż liczyłoby się jako "tylko admin" — mirror
 * identycznej logiki w EditableMerge::apply() (backend, realne wymuszanie).
 */
function collectFields(
  node: unknown,
  path: Path,
  group: string | null,
  key: string | null,
  role: string | null | undefined,
  pageAcl: Acl | undefined,
  columnLabelsForRows?: Record<string, string>
): FlatField[] {
  if (isEditableValue(node)) {
    // Brak WŁASNEGO "acl" -> dziedziczy "acl" całej strony (pageAcl); brak obu ->
    // pole tylko dla roli "admin" (patrz src/lib/acl.ts). Rola bez dostępu do
    // odczytu nie widzi pola w ogóle — tak samo jak strukturalny brak
    // {value,editable} dziś (ta funkcja go po prostu pomija), nie "zablokowany" input.
    if (!canRead(node.acl ?? pageAcl, role)) return [];

    const ownLabel = node.label && node.label.trim() !== "" ? node.label : key ? labelFor(key) : "Wartość";
    const name = key ?? path.map(String).join(".");
    return [
      {
        groupPrefix: group,
        ownLabel,
        name,
        node,
        path,
        columnLabels: key === "rows" ? columnLabelsForRows : undefined,
      },
    ];
  }

  if (Array.isArray(node)) {
    return node.flatMap((item, index) => {
      const itemGroup = describeArrayItem(item, `Element ${index + 1}`);
      return collectFields(item, [...path, index], itemGroup, null, role, pageAcl);
    });
  }

  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;

    // Konwencja "columns" + "rows" obok siebie w tym samym obiekcie fields (patrz PriceHistory) —
    // wyłącznie podpowiedź nagłówków kolumn, nie wpływa na to, KTÓRY edytor się wybiera (to wciąż field.type).
    const siblingColumnsNode = record.columns;
    const siblingColumnLabels =
      isEditableValue(siblingColumnsNode) && siblingColumnsNode.type === "table"
        ? extractColumnLabels(siblingColumnsNode.value)
        : undefined;

    return Object.entries(record).flatMap(([childKey, value]) => {
      if (TRANSPARENT_KEYS.has(childKey)) {
        return collectFields(value, [...path, childKey], group, null, role, pageAcl, siblingColumnLabels);
      }

      const isPlainObject =
        value !== null && typeof value === "object" && !Array.isArray(value) && !isEditableValue(value);
      const nextGroup =
        isPlainObject && group === null ? groupLabelFor(childKey, value as Record<string, unknown>) : group;

      return collectFields(value, [...path, childKey], nextGroup, childKey, role, pageAcl, siblingColumnLabels);
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
  // "acl" na najwyższym poziomie treści to acl CAŁEJ STRONY (patrz Page.acl w
  // src/lib/content.ts) — dziedziczone przez każde pole bez własnego "acl",
  // patrz komentarz przy collectFields().
  const pageAcl = isPlainObject(node) ? (node.acl as Acl | undefined) : undefined;
  const fields = collectFields(node, [], null, null, session?.role, pageAcl);

  if (fields.length === 0) {
    return <p className="text-sm text-zinc-500">Ta strona nie ma pól do edycji.</p>;
  }

  return (
    <div className="divide-y divide-zinc-100">
      {fields.map((field) => (
        <div key={field.path.join(".")} className="py-4 first:pt-0 last:pb-0">
          <EditableControl field={field} session={session} pageAcl={pageAcl} onChange={onChange} />
        </div>
      ))}
    </div>
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Jedyne miejsce, gdzie field.type spotyka się z komponentem edytora
 * (src/components/admin/fields/registry.ts) — żadnego sprawdzania nazwy pola,
 * żadnego typeof(value). "label" jest tu edytowalnym inputem (niezależnym od
 * "name"/value — patrz EditableMerge::apply po stronie backendu), "name" to
 * tylko podgląd techniczny (klucz pola w JSON-ie).
 */
function EditableControl({
  field,
  session,
  pageAcl,
  onChange,
}: {
  field: FlatField;
  session: Session | null;
  pageAcl: Acl | undefined;
  onChange: OnChange;
}) {
  const { groupPrefix, ownLabel, name, node, path, columnLabels } = field;
  const valuePath = [...path, "value"];

  // "acl" z permission:"read" (bez "write") blokuje edycję dokładnie tak samo jak
  // editable:false — widoczne, ale zablokowane. collectFields() już odfiltrował
  // pola bez prawa ODCZYTU w ogóle, więc tu liczy się tylko prawo ZAPISU. Brak
  // WŁASNEGO "acl" na polu dziedziczy acl całej strony (pageAcl), tak samo jak
  // przy odczycie w collectFields().
  if (!node.editable || !canWrite(node.acl ?? pageAcl, session?.role)) {
    const preview = isPlainObject(node.value) || Array.isArray(node.value) ? JSON.stringify(node.value) : String(node.value);
    return (
      <div>
        {groupPrefix && <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{groupPrefix}</div>}
        <div className="text-sm font-medium text-zinc-500">{ownLabel}</div>
        <div className="font-mono text-[10px] text-zinc-400">{name}</div>
        <div className="mt-1 text-sm text-zinc-400">{preview} · tylko do odczytu</div>
      </div>
    );
  }

  const declaredType = hasValidType(node) ? node.type : null;
  const effectiveType = declaredType ?? classifyFieldType(node.value, ownLabel);
  const Editor = fieldEditors[effectiveType];

  return (
    <div>
      {groupPrefix && (
        <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{groupPrefix}</div>
      )}
      <input
        type="text"
        value={ownLabel}
        onChange={(event) => onChange([...path, "label"], event.target.value)}
        aria-label="Etykieta pola"
        className="mb-0.5 block w-full border-none bg-transparent p-0 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-0"
      />
      <div className="mb-1.5 font-mono text-[10px] text-zinc-400">{name}</div>

      {!declaredType && (
        <div className="mb-1.5 text-[11px] text-amber-600">
          ⚠ Pole bez zadeklarowanego typu — wykryto awaryjnie: {effectiveType}. Zgłoś to do dewelopera (patrz
          scripts/migrate-field-types.ts / backend/scripts/backfill-field-types.php).
        </div>
      )}

      <Editor
        label={ownLabel}
        name={name}
        value={node.value}
        path={valuePath}
        session={session}
        onChange={onChange}
        meta={{ columnLabels }}
      />
    </div>
  );
}
