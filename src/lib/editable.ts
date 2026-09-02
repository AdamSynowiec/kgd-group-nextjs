/**
 * Konwencja "edytowalnego pola": { value: T, editable: boolean, label?: string }.
 * editable: true -> CMS pokazuje kontrolkę do zmiany; editable: false ->
 * pole jest tylko do odczytu. Pola BEZ tego kształtu są dla CMS-a niewidoczne
 * (nie da się ich zmienić stąd) — to backend (EditableMerge.php) i frontend
 * (EditableField.tsx) zgadzają się na tę samą regułę niezależnie od siebie.
 *
 * "label" — podpis pola widoczny w panelu — jest częścią TREŚCI (JSON w bazie),
 * nie słownikiem w kodzie silnika. Dzięki temu ten sam, niezmieniony kod panelu
 * pokazuje sensowne, spójne z resztą serwisu etykiety w dowolnym projekcie —
 * silnik nie musi "znać" znaczenia pola, tylko je wyświetlić. Opcjonalne
 * (kompatybilność wsteczna): brak "label" nie chowa pola, panel dobiera
 * wtedy czytelną etykietę awaryjnie z nazwy klucza.
 *
 * Zero importów Node/przeglądarki — ten plik jest współdzielony między
 * warstwą budowaną (content.ts, fs) i panelem w przeglądarce (adminApi.ts).
 */

export type EditableValue<T = unknown> = { value: T; editable: boolean; label?: string };

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
