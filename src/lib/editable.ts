/**
 * Konwencja "edytowalnego pola": { value: T, editable: boolean, label?: string, type: FieldType }.
 * editable: true -> CMS pokazuje kontrolkę do zmiany; editable: false ->
 * pole jest tylko do odczytu. Pola BEZ tego kształtu są dla CMS-a niewidoczne
 * (nie da się ich zmienić stąd) — to backend (EditableMerge.php) i frontend
 * (EditableField.tsx) zgadzają się na tę samą regułę niezależnie od siebie.
 *
 * "label" — podpis pola widoczny w panelu — jest częścią TREŚCI (JSON w bazie),
 * nie słownikiem w kodzie silnika, i jest edytowalny z panelu niezależnie od
 * "value" (patrz EditableMerge::apply). Dzięki temu ten sam, niezmieniony kod
 * panelu pokazuje sensowne, spójne z resztą serwisu etykiety w dowolnym
 * projekcie — silnik nie musi "znać" znaczenia pola, tylko je wyświetlić.
 * Opcjonalne (kompatybilność wsteczna): brak "label" nie chowa pola, panel
 * dobiera wtedy czytelną etykietę awaryjnie z nazwy klucza.
 *
 * "type" — jawny, ustalony przy tworzeniu pola typ danych/edytora. To ON,
 * a nie kształt "value", decyduje który edytor panel pokaże (patrz
 * src/components/admin/fields/registry.ts) — panel nigdy nie zgaduje typu
 * z typeof wartości. "type" NIE jest edytowalny z panelu (to część definicji
 * pola, nie jego treści) — backend (EditableMerge::apply) nigdy nie
 * nadpisuje go wartością przychodzącą z żądania.
 *
 * Stabilny techniczny identyfikator pola ("name" w terminologii CMS-owej) to
 * po prostu klucz obiektu, pod którym pole leży w JSON-ie (np. "header",
 * "apartments") — nigdy nie pochodzi z "label" i nigdy się nie zmienia przy
 * edycji etykiety, więc nie trzeba go duplikować jako osobny string (ryzyko
 * rozjazdu). Panel wyświetla go pomocniczo, wyprowadzając ze ścieżki pola.
 *
 * Zero importów Node/przeglądarki — ten plik jest współdzielony między
 * warstwą budowaną (content.ts, fs) i panelem w przeglądarce (adminApi.ts).
 */

import { type FieldType, isFieldType } from "./fieldType";

export type { FieldType };

export type EditableValue<T = unknown> = { value: T; editable: boolean; label?: string; type: FieldType };

export function isEditableValue(node: unknown): node is EditableValue {
  return (
    node !== null &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    "value" in node &&
    "editable" in node &&
    typeof (node as { editable: unknown }).editable === "boolean"
  );
}

/** Wyciąga wartość niezależnie od tego, czy pole jest opakowane, czy nie (kompatybilność wsteczna). */
export function unwrap<T>(node: EditableValue<T> | T | undefined): T | undefined {
  if (node === undefined) return undefined;
  return isEditableValue(node) ? (node as EditableValue<T>).value : (node as T);
}

/**
 * Węzeł edytowalny Z poprawnym, zapisanym "type" — to jest to, czego panel
 * potrzebuje, żeby wybrać edytor z rejestru (src/components/admin/fields/registry.ts)
 * bez zgadywania. Węzeł bez poprawnego "type" (nie powinien wystąpić po
 * migracji — patrz scripts/migrate-field-types.mjs) NIE spełnia tego guarda;
 * panel renderuje go wtedy przez jawnie oznaczony fallback, nie przez cichy
 * domysł traktowany jak normalna ścieżka.
 */
export function hasValidType<T = unknown>(node: EditableValue<T>): node is EditableValue<T> & { type: FieldType } {
  return isFieldType(node.type);
}
