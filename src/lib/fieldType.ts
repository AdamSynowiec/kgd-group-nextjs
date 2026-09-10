/**
 * Klasyfikacja "type" pola CMS-a (string|bool|number|table|asset|richtext) na
 * podstawie kształtu wartości (i, dla assetów z pustą wartością, etykiety).
 *
 * UWAGA: to NIE jest mechanizm renderowania panelu admina — panel renderuje
 * WYŁĄCZNIE na podstawie zapisanego już `field.type` (patrz
 * src/components/admin/EditableField.tsx). Ta funkcja służy tylko:
 *   1) jednorazowemu backfillowi `type` w istniejącej treści (scripts/, oraz
 *      analogiczny skrypt PHP dla żywej bazy),
 *   2) awaryjnemu, WIDOCZNIE oznaczonemu fallbackowi w panelu dla węzła, który
 *      (nie powinien, ale) nie ma jeszcze zapisanego `type`.
 * Nigdy nie jest wywoływana jako normalna ścieżka wyboru edytora.
 *
 * "richtext" NIE jest tu wykrywane z kształtu — string sformatowanego HTML-a
 * i zwykły string wyglądają identycznie (oba to `typeof value === "string"`),
 * więc classifyFieldType() zawsze spadnie na "string" dla takiej wartości.
 * Pole musi dostać "richtext" jawnie w miejscu, gdzie powstaje (patrz
 * src/lib/pageTemplates.ts — pole "body" wpisu bloga) — to jest właśnie ta
 * "jawność typu", o którą chodzi w całym tym systemie.
 */

export type FieldType = "string" | "bool" | "number" | "table" | "asset" | "richtext";

export const FIELD_TYPES: readonly FieldType[] = ["string", "bool", "number", "table", "asset", "richtext"];

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && (FIELD_TYPES as readonly string[]).includes(value);
}

/** Te same heurystyki co dotychczasowe ASSET_VALUE_PATTERN/ASSET_LABEL_HINT w EditableField.tsx. */
const ASSET_VALUE_PATTERN = /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?.*)?$/i;
const ASSET_LABEL_HINT =
  /logo|ikon|zdj[eę]c|obraz|miniatur|thumbnail|photo|image|\bt[łl]o\b|background|avatar|favicon|baner|banner|wizualizacj/i;

function isScalar(value: unknown): boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

/**
 * "Płaski słownik": obiekt (nie tablica), którego liście to same skalary albo
 * zagnieżdżone o jeden poziom obiekty samych skalarów (kształt "consents":
 * {consent: {label, details}, ...}). Taki kształt traktujemy jako "table"
 * (tabela klucz/wartość o stałym zestawie kluczy), bo żaden z pięciu
 * dozwolonych typów nie pasuje lepiej, a dokładnie to renderuje TableEditor
 * w trybie "słownikowym".
 */
function isFlatDict(value: object): boolean {
  return Object.values(value as Record<string, unknown>).every((leaf) => {
    if (isScalar(leaf)) return true;
    if (leaf !== null && typeof leaf === "object" && !Array.isArray(leaf)) {
      return Object.values(leaf as Record<string, unknown>).every(isScalar);
    }
    return false;
  });
}

/** Wykorzystywane też per-kolumna przez TableEditor (np. kolumna "path" w galerii) — nie tylko przy klasyfikacji całych pól. */
export function looksLikeAssetPath(value: string): boolean {
  return ASSET_VALUE_PATTERN.test(value);
}

export function classifyFieldType(value: unknown, label?: string): FieldType {
  if (typeof value === "boolean") return "bool";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "table";
  if (value !== null && typeof value === "object" && isFlatDict(value)) return "table";

  if (typeof value === "string") {
    if (looksLikeAssetPath(value)) return "asset";
    if (value === "" && label && ASSET_LABEL_HINT.test(label)) return "asset";
    return "string";
  }

  return "string";
}
