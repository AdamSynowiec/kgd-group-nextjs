"use client";

import { useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { RICH_TEXT_CONTENT_CLASS } from "@/lib/richTextStyles";
import { isEditorEmpty } from "@/lib/richText/commands";

/**
 * Sama powierzchnia contenteditable — celowo "głupia": tylko okablowanie
 * zdarzeń DOM, żadnej logiki sanityzacji/historii (to robi RichTextEditor.tsx,
 * które jako jedyne zna zarówno sanitizeHtml, jak i stos undo/redo — unika to
 * powielania tej logiki w dwóch miejscach).
 *
 * KRYTYCZNE (wniosek z wcześniejszego buga #418 przy Tiptap): innerHTML jest
 * ustawiany WYŁĄCZNIE raz, przy montowaniu (useState(() => initialHtml) —
 * inicjalizator jest wywoływany tylko przy pierwszym renderze; stan celowo
 * nigdy nie jest dalej ustawiany). Ten komponent NIGDY nie synchronizuje się
 * z powrotem z propem `initialHtml` przy kolejnych renderach — zmiana idzie
 * tylko w górę, przez onChange. (useRef.current nie nadaje się tu wprost —
 * odczyt refa w JSX podczas renderu jest niedozwolony przez reguły haków
 * React, patrz react-hooks/refs.)
 *
 * Tekst pomocniczy pustego stanu NIE jest przez CSS ":empty" (contenteditable
 * po wpisaniu i skasowaniu całej treści zwykle zostaje z samym <br> — więc
 * ":empty" przestaje pasować, mimo że wizualnie jest pusto) — zamiast tego
 * lokalny stan `isEmpty`, aktualizowany po każdej zmianie przez isEditorEmpty().
 */
export default function EditableSurface({
  editorRef,
  initialHtml,
  ariaLabel,
  placeholder,
  onChange,
  onKeyDown,
  onImageClick,
  onDragStart,
  onDragEnd,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  initialHtml: string;
  ariaLabel: string;
  placeholder: string;
  onChange: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** PODWÓJNE kliknięcie istniejącego <img> w treści — otwiera panel wstawiania zdjęcia w trybie edycji tego węzła (patrz RichTextEditor.tsx). Celowo dblclick, nie zwykły click: obrazek jest natywnie przeciągalny (drag&drop w obrębie contenteditable, wbudowane w przeglądarkę, żadnego własnego kodu) — zwykły onClick łapał też mouseup na końcu przeciągania, blokując przenoszenie. */
  onImageClick: (img: HTMLImageElement) => void;
  /** Anuluje ewentualny OCZEKUJĄCY (z pisania sprzed chwili) debounce w RichTextEditor.tsx — patrz isDraggingRef niżej, ten sam powód. */
  onDragStart: () => void;
  /** Natychmiastowa (nie debounced) synchronizacja PO zakończeniu przeciągania — mirror handleBlur w RichTextEditor.tsx. */
  onDragEnd: () => void;
}) {
  const [mountHtml] = useState(() => initialHtml);
  const [isEmpty, setIsEmpty] = useState(
    () => !/<img\b/i.test(initialHtml) && !/data-columns/i.test(initialHtml) && initialHtml.replace(/<[^>]*>/g, "").trim() === ""
  );
  /**
   * Prawda między dragstart a dragend NATYWNEGO przeciągania w obrębie tej
   * powierzchni (np. przenoszenie <img> między akapitami — wbudowane w
   * contenteditable, żadnego własnego kodu do samego przenoszenia). KRYTYCZNE:
   * dopóki trwa, handleInput NIE wywołuje onChange() — RichTextEditor.tsx w
   * odpowiedzi na onChange w końcu podmienia root.innerHTML (sanitize-on-write,
   * patrz syncFromDom), a podmiana całego poddrzewa DOM PODCZAS aktywnego
   * przeciągania (przeglądarka wciąż śledzi węzeł-źródło przeciągania, który
   * właśnie znikł) potrafi zawiesić kartę — to był rzeczywisty efekt zgłoszony
   * jako "zamraża ekran". Ref, nie state — nie potrzeba re-renderu, tylko
   * odczytu w handleInput.
   */
  const isDraggingRef = useRef(false);
  /** TYMCZASOWE — licznik dragover do debugowania (patrz handleDragOver), do usunięcia razem z resztą console.log w tym pliku. */
  const dragOverCountRef = useRef(0);

  function refreshEmptyState() {
    if (editorRef.current) setIsEmpty(isEditorEmpty(editorRef.current));
  }

  function handleInput() {
    console.log("[rt-debug] input", { dragging: isDraggingRef.current, t: performance.now() });
    refreshEmptyState();
    if (isDraggingRef.current) return;
    onChange();
  }

  function handleDragStart(event: React.DragEvent<HTMLDivElement>) {
    console.log("[rt-debug] dragstart", { target: event.target instanceof Element ? event.target.tagName : event.target, t: performance.now() });
    isDraggingRef.current = true;
    onDragStart();
  }

  /** dragend ZAWSZE odpala się po dragstart (w odróżnieniu od "drop" — nie odpala się np. gdy przeciąganie zostanie anulowane klawiszem Escape), więc to jedyne bezpieczne miejsce na odblokowanie i domknięcie odłożonej synchronizacji. */
  function handleDragEnd(event: React.DragEvent<HTMLDivElement>) {
    console.log("[rt-debug] dragend", { target: event.target instanceof Element ? event.target.tagName : event.target, t: performance.now() });
    isDraggingRef.current = false;
    refreshEmptyState();
    onDragEnd();
  }

  function handleDragOver() {
    dragOverCountRef.current += 1;
    if (dragOverCountRef.current % 25 === 1) {
      console.log("[rt-debug] dragover x" + dragOverCountRef.current, { t: performance.now() });
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    console.log("[rt-debug] drop", { defaultPrevented: event.defaultPrevented, t: performance.now() });
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    // Wymóg: wklejanie bez przenoszenia obcego formatowania (Word, strony WWW) —
    // bierzemy WYŁĄCZNIE czysty tekst ze schowka, nigdy HTML.
    const text = event.clipboardData.getData("text/plain");
    if (text === "") return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    refreshEmptyState();
    onChange();
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLImageElement) {
      onImageClick(event.target);
    }
  }

  return (
    <div className="relative">
      {isEmpty && (
        <span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-400" aria-hidden>
          {placeholder}
        </span>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        dangerouslySetInnerHTML={{ __html: mountHtml }}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={onKeyDown}
        onDoubleClick={handleDoubleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`${RICH_TEXT_CONTENT_CLASS} min-h-[220px] rounded-b-md px-3 py-2 text-sm leading-relaxed focus:outline-none [&_img]:cursor-pointer [&_img:hover]:outline [&_img:hover]:outline-2 [&_img:hover]:outline-offset-2 [&_img:hover]:outline-blue-400 [&_[data-column]]:min-h-[2rem] [&_[data-column]]:rounded [&_[data-column]]:p-2 [&_[data-column]]:outline [&_[data-column]]:outline-1 [&_[data-column]]:outline-dashed [&_[data-column]]:outline-zinc-300`}
      />
    </div>
  );
}
