"use client";

import { useState, type KeyboardEvent, type RefObject } from "react";
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
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  initialHtml: string;
  ariaLabel: string;
  placeholder: string;
  onChange: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const [mountHtml] = useState(() => initialHtml);
  const [isEmpty, setIsEmpty] = useState(() => !/<img\b/i.test(initialHtml) && initialHtml.replace(/<[^>]*>/g, "").trim() === "");

  function refreshEmptyState() {
    if (editorRef.current) setIsEmpty(isEditorEmpty(editorRef.current));
  }

  function handleInput() {
    refreshEmptyState();
    onChange();
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
        className={`${RICH_TEXT_CONTENT_CLASS} min-h-[220px] rounded-b-md px-3 py-2 text-sm leading-relaxed focus:outline-none`}
      />
    </div>
  );
}
