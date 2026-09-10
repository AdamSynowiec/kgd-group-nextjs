"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { RICH_TEXT_CONTENT_CLASS } from "@/lib/richTextStyles";
import { getBlockContainerOf, isEditorEmpty, repositionImage, type ImageDropTarget } from "@/lib/richText/commands";

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
  onImageRepositioned,
  onDragStart,
  onDragEnd,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  initialHtml: string;
  ariaLabel: string;
  placeholder: string;
  onChange: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** Kliknięcie (bez przeciągnięcia) istniejącego <img> — otwiera panel edycji tego węzła. */
  onImageClick: (img: HTMLImageElement) => void;
  /** Obrazek faktycznie przeniesiony przeciągnięciem (patrz handleImageMouseDown niżej) — RichTextEditor.tsx musi zsynchronizować/zsanityzować wynik, tej mutacji DOM nie da się złapać przez onInput (nie idzie przez natywne wpisywanie). */
  onImageRepositioned: () => void;
  /** Anuluje ewentualny OCZEKUJĄCY (z pisania sprzed chwili) debounce w RichTextEditor.tsx — patrz isDraggingRef niżej, ten sam powód. */
  onDragStart: () => void;
  /** Natychmiastowa (nie debounced) synchronizacja PO zakończeniu przeciągania — mirror handleBlur w RichTextEditor.tsx. */
  onDragEnd: () => void;
}) {
  const [mountHtml] = useState(() => initialHtml);
  const [isEmpty, setIsEmpty] = useState(
    () => !/<img\b/i.test(initialHtml) && !/data-columns/i.test(initialHtml) && initialHtml.replace(/<[^>]*>/g, "").trim() === ""
  );
  const indicatorRef = useRef<HTMLDivElement>(null);

  /**
   * Prawda między dragstart a dragend NATYWNEGO przeciągania w obrębie tej
   * powierzchni — dotyczy przeciągania ZAZNACZONEGO TEKSTU (wbudowane w
   * contenteditable; obrazki mają WŁASNY mechanizm, patrz imageDragRef niżej,
   * i nie są już natywnie przeciągalne). KRYTYCZNE: dopóki trwa, handleInput
   * NIE wywołuje onChange() — RichTextEditor.tsx w odpowiedzi na onChange w
   * końcu podmienia root.innerHTML (sanitize-on-write, patrz syncFromDom), a
   * podmiana całego poddrzewa DOM PODCZAS aktywnego przeciągania (przeglądarka
   * wciąż śledzi węzeł-źródło przeciągania) potrafi zawiesić kartę. Ref, nie
   * state — nie potrzeba re-renderu, tylko odczytu w handleInput.
   */
  const isDraggingRef = useRef(false);

  /**
   * Stan WŁASNEGO przeciągania obrazka — na zwykłych zdarzeniach myszy, NIE
   * na natywnym API drag&drop (patrz commands.ts::insertImage, dlaczego).
   * `dragging` staje się true dopiero po przekroczeniu progu ruchu
   * (DRAG_THRESHOLD_PX) — dzięki temu zwykłe kliknięcie (mousedown+mouseup
   * bez ruchu) nadal otwiera panel edycji (onImageClick), a nie zaczyna
   * przeciągania. Ref, nie state: mousemove leci nawet setki razy na
   * sekundę, re-render przy każdym byłby marnotrawstwem — pozycję wskaźnika
   * aktualizujemy przez bezpośrednią manipulację stylem (indicatorRef).
   */
  const imageDragRef = useRef<{
    img: HTMLImageElement;
    startX: number;
    startY: number;
    dragging: boolean;
    target: ImageDropTarget | null;
  } | null>(null);

  const DRAG_THRESHOLD_PX = 4;

  function refreshEmptyState() {
    if (editorRef.current) setIsEmpty(isEditorEmpty(editorRef.current));
  }

  function handleInput() {
    refreshEmptyState();
    if (isDraggingRef.current) return;
    onChange();
  }

  function handleDragStart() {
    isDraggingRef.current = true;
    onDragStart();
  }

  /** dragend ZAWSZE odpala się po dragstart (w odróżnieniu od "drop" — nie odpala się np. gdy przeciąganie zostanie anulowane klawiszem Escape), więc to jedyne bezpieczne miejsce na odblokowanie i domknięcie odłożonej synchronizacji. */
  function handleDragEnd() {
    isDraggingRef.current = false;
    refreshEmptyState();
    onDragEnd();
  }

  /**
   * event.preventDefault() jest tu WYMAGANE przez natywne API drag&drop —
   * bez tego przeglądarka nigdy nie zgłasza tego miejsca jako poprawny cel
   * upuszczenia, więc "drop" nigdy się nie odpala. Dotyczy KAŻDEGO celu
   * upuszczenia w tym API, nie tylko contenteditable. (Dotyczy już tylko
   * przeciągania tekstu — obrazki mają własny mechanizm, patrz niżej.)
   */
  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
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

  function showIndicator(root: HTMLElement, target: ImageDropTarget) {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    const rootRect = root.getBoundingClientRect();
    const blockRect = target.block.getBoundingClientRect();
    const top = (target.position === "before" ? blockRect.top : blockRect.bottom) - rootRect.top;

    indicator.style.top = `${top}px`;
    indicator.style.display = "block";
  }

  function hideIndicator() {
    if (indicatorRef.current) indicatorRef.current.style.display = "none";
  }

  /**
   * Znajduje cel upuszczenia z punktu (x,y) — najbliższy blok akapitu/nagłówka
   * pod kursorem i to, czy jesteśmy w górnej czy dolnej połowie jego
   * wysokości (decyduje "przed" vs "po"). Odrzuca cel będący blokiem SAMEGO
   * przeciąganego obrazka (bez sensu upuszczać obok samego siebie) i punkty
   * poza edytorem.
   */
  function findDropTarget(root: HTMLElement, img: HTMLImageElement, x: number, y: number): ImageDropTarget | null {
    const elAtPoint = document.elementFromPoint(x, y);
    if (!elAtPoint || !root.contains(elAtPoint)) return null;

    const block = getBlockContainerOf(root, elAtPoint);
    if (!block || block.contains(img)) return null;

    const rect = block.getBoundingClientRect();
    const position: ImageDropTarget["position"] = y < rect.top + rect.height / 2 ? "before" : "after";
    return { block, position };
  }

  function handleImageMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLImageElement) || event.button !== 0) return;

    // Zapobiega ubocznym efektom mousedown na obrazku (np. start zaznaczania
    // tekstu wokół) bez ruszania normalnego zachowania reszty edytora.
    event.preventDefault();

    imageDragRef.current = { img: event.target, startX: event.clientX, startY: event.clientY, dragging: false, target: null };
    document.addEventListener("mousemove", handleImageMouseMove);
    document.addEventListener("mouseup", handleImageMouseUp);
  }

  function handleImageMouseMove(event: MouseEvent) {
    const state = imageDragRef.current;
    const root = editorRef.current;
    if (!state || !root) return;

    // Przycisk puszczony poza oknem (bez zdarzenia mouseup, np. przeciągnięcie
    // poza viewport) — event.buttons wtedy wraca do 0 przy kolejnym mousemove.
    if (event.buttons === 0) {
      cancelImageDrag();
      return;
    }

    if (!state.dragging) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

      state.dragging = true;
      state.img.style.opacity = "0.4";
      document.body.style.cursor = "grabbing";
      document.addEventListener("keydown", handleImageDragKeyDown);
    }

    const target = findDropTarget(root, state.img, event.clientX, event.clientY);
    state.target = target;

    if (target) {
      showIndicator(root, target);
    } else {
      hideIndicator();
    }
  }

  function handleImageMouseUp() {
    const state = imageDragRef.current;
    cleanupImageDragListeners();

    if (!state) return;

    if (state.dragging) {
      state.img.style.opacity = "";
      document.body.style.cursor = "";
      hideIndicator();

      const root = editorRef.current;
      if (root && state.target) {
        repositionImage(root, state.img, state.target);
        refreshEmptyState();
        onImageRepositioned();
      }
    } else {
      // Mousedown+mouseup bez przekroczenia progu ruchu -> zwykłe kliknięcie.
      onImageClick(state.img);
    }

    imageDragRef.current = null;
  }

  function handleImageDragKeyDown(event: globalThis.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelImageDrag();
    }
  }

  function cancelImageDrag() {
    const state = imageDragRef.current;
    if (state?.dragging) {
      state.img.style.opacity = "";
      document.body.style.cursor = "";
      hideIndicator();
    }
    cleanupImageDragListeners();
    imageDragRef.current = null;
  }

  function cleanupImageDragListeners() {
    document.removeEventListener("mousemove", handleImageMouseMove);
    document.removeEventListener("mouseup", handleImageMouseUp);
    document.removeEventListener("keydown", handleImageDragKeyDown);
  }

  // Bezpiecznik na odmontowanie komponentu W TRAKCIE przeciągania (np.
  // przełączenie na widok "Podgląd HTML"). Celowo puste [] — to WYŁĄCZNIE
  // zabezpieczenie na wypadek nietypowego odmontowania, nie normalny tor
  // zdarzeń: handleImageMouseMove/-Up i tak zawsze czytają świeże
  // imageDragRef.current/editorRef.current (referencje refów są stabilne
  // między renderami, tylko .current się zmienia), więc nawet "nieświeże"
  // domknięcie z tego efektu bezpiecznie sprząta nasłuchy, zanim ktokolwiek
  // spróbuje odczytać stan po odmontowaniu.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanupImageDragListeners celowo poza deps, patrz komentarz wyżej
  useEffect(() => cleanupImageDragListeners, []);

  return (
    <div className="relative">
      {isEmpty && (
        <span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-400" aria-hidden>
          {placeholder}
        </span>
      )}
      <div
        ref={indicatorRef}
        aria-hidden
        style={{ display: "none" }}
        className="pointer-events-none absolute left-0 right-0 z-10 h-[3px] -translate-y-1/2 rounded-full bg-blue-500"
      />
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
        onMouseDown={handleImageMouseDown}
        onKeyDown={onKeyDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        className={`${RICH_TEXT_CONTENT_CLASS} min-h-[220px] rounded-b-md px-3 py-2 text-sm leading-relaxed focus:outline-none [&_img]:cursor-grab [&_img:active]:cursor-grabbing [&_img:hover]:outline [&_img:hover]:outline-2 [&_img:hover]:outline-offset-2 [&_img:hover]:outline-blue-400 [&_[data-column]]:min-h-[2rem] [&_[data-column]]:rounded [&_[data-column]]:p-2 [&_[data-column]]:outline [&_[data-column]]:outline-1 [&_[data-column]]:outline-dashed [&_[data-column]]:outline-zinc-300`}
      />
    </div>
  );
}
