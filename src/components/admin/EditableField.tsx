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

export type FieldSection = { id: string; label: string; fields: FlatField[] };

/**
 * Pola z collectFields() pogrupowane w sekcje wg kontekstu (np. "Hero", "Lokalizacja") —
 * kolejne pola z tym samym groupPrefix trafiają do jednej karty edytora. Pola najwyższego
 * poziomu (bez kontekstu, np. tytuł strony) lądują w sekcji "Ogólne".
 */
export function fieldSections(node: unknown, role: string | null | undefined): FieldSection[] {
  const pageAcl = isPlainObject(node) ? (node.acl as Acl | undefined) : undefined;
  const sections: FieldSection[] = [];
  for (const field of collectFields(node, [], null, null, role, pageAcl)) {
    const label = field.groupPrefix ?? "Ogólne";
    const last = sections[sections.length - 1];
    if (last && last.label === label) last.fields.push(field);
    else sections.push({ id: `sekcja-${sections.length + 1}`, label, fields: [field] });
  }
  return sections;
}

/**
 * Wejście panelu: zamienia treść strony na formularz — sekcje (karty, zwijane) z
 * podpisanymi polami jedno pod drugim, bez zagnieżdżeń. Zwinięte sekcje kontroluje
 * rodzic (ContentEditor — spis sekcji obok rozwija sekcję, do której przewija).
 */
export default function EditableField({
  node,
  session,
  onChange,
  collapsed,
  onToggleSection,
}: {
  node: unknown;
  session: Session | null;
  onChange: OnChange;
  collapsed?: Set<string>;
  onToggleSection?: (id: string) => void;
}) {
  // "acl" na najwyższym poziomie treści to acl CAŁEJ STRONY (patrz Page.acl w
  // src/lib/content.ts) — dziedziczone przez każde pole bez własnego "acl",
  // patrz komentarz przy collectFields().
  const pageAcl = isPlainObject(node) ? (node.acl as Acl | undefined) : undefined;
  const sections = fieldSections(node, session?.role);

  if (sections.length === 0) {
    return <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-500">Ta strona nie ma pól do edycji.</p>;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const isCollapsed = collapsed?.has(section.id) ?? false;
        return (
          <section key={section.id} id={section.id} className="scroll-mt-36 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <button
              type="button"
              onClick={() => onToggleSection?.(section.id)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-zinc-50/80"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-[11px] font-semibold tabular-nums text-zinc-500 ring-1 ring-inset ring-zinc-200/60">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">{section.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                {section.fields.length} {section.fields.length === 1 ? "pole" : section.fields.length < 5 ? "pola" : "pól"}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {section.fields.map((field) => (
                  <div key={field.path.join(".")} className="px-5 py-5">
                    <EditableControl field={field} session={session} pageAcl={pageAcl} onChange={onChange} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
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
  const { ownLabel, name, node, path, columnLabels } = field;
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
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[13px] font-medium text-zinc-500">{ownLabel}</div>
          <code className="font-mono text-[10px] text-zinc-400">{name}</code>
        </div>
        <div className="mt-1.5 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
          {preview}
          <span className="ml-2 text-xs text-zinc-400">· tylko do odczytu</span>
        </div>
      </div>
    );
  }

  const declaredType = hasValidType(node) ? node.type : null;
  const effectiveType = declaredType ?? classifyFieldType(node.value, ownLabel);
  const Editor = fieldEditors[effectiveType];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <input
          type="text"
          value={ownLabel}
          onChange={(event) => onChange([...path, "label"], event.target.value)}
          aria-label="Etykieta pola"
          title="Etykieta pola (można zmienić)"
          className="-mx-1 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
        />
        <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">{name}</code>
      </div>

      {!declaredType && (
        <div className="mb-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 ring-1 ring-inset ring-amber-600/15">
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
