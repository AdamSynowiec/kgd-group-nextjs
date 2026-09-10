/**
 * Własny stos cofnij/ponów dla edytora artykułów — NIE polega na natywnym
 * undo przeglądarki. Powód: część komend (wstawianie obrazka) manipuluje DOM-em
 * bezpośrednio przez Range API, poza tym, co natywny mechanizm undo
 * kontenteditable rzetelnie śledzi — mieszanka dawałaby niespójne efekty.
 * Migawki to pełny innerHTML edytora; RichTextEditor.tsx przechwytuje
 * Ctrl+Z/Ctrl+Y i wywołuje preventDefault(), żeby natywne undo nie
 * konkurowało z tym stosem.
 *
 * Celowo bez zewnętrznej biblioteki do zarządzania stanem — to jest dokładnie
 * tyle logiki (tablica + indeks), że własna implementacja jest prostsza i
 * łatwiejsza w utrzymaniu niż jakakolwiek zależność.
 */
export type EditorHistory = {
  push: (html: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

const MAX_ENTRIES = 100;

export function createHistory(initialHtml: string): EditorHistory {
  let entries = [initialHtml];
  let index = 0;

  function push(html: string): void {
    if (html === entries[index]) return;

    entries = entries.slice(0, index + 1);
    entries.push(html);
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(entries.length - MAX_ENTRIES);
    }
    index = entries.length - 1;
  }

  function undo(): string | null {
    if (index <= 0) return null;
    index -= 1;
    return entries[index];
  }

  function redo(): string | null {
    if (index >= entries.length - 1) return null;
    index += 1;
    return entries[index];
  }

  return {
    push,
    undo,
    redo,
    canUndo: () => index > 0,
    canRedo: () => index < entries.length - 1,
  };
}
