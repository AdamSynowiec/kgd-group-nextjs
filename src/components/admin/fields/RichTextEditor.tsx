"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FieldEditorProps } from "./types";
import EditableSurface from "./richtext/EditableSurface";
import Toolbar, { type ViewMode } from "./richtext/Toolbar";
import LinkPopover from "./richtext/LinkPopover";
import ImagePopover from "./richtext/ImagePopover";
import ColumnsPopover from "./richtext/ColumnsPopover";
import HtmlPreview from "./richtext/HtmlPreview";
import { sanitizeHtml } from "@/lib/richText/sanitizeHtml";
import { createHistory } from "@/lib/richText/history";
import {
  applyLink,
  findAncestorTag,
  getActiveBlockType,
  getActiveListTag,
  getActiveTextAlign,
  getImageAlign,
  insertColumns,
  insertImage,
  isMarkActive,
  removeLink,
  restoreSelection,
  saveSelection,
  setBlockType as applyBlockType,
  setImageAlign,
  setTextAlign as applyTextAlign,
  toggleInlineMark,
  toggleList as applyToggleList,
  updateImageAttributes,
  updateLinkAttributes,
  type BlockType,
  type ImageWidth,
  type InlineMark,
  type TextAlign,
} from "@/lib/richText/commands";

/**
 * Edytor artykułów bloga — własna implementacja (bez bibliotek/gotowych
 * edytorów). Architektura i decyzje techniczne opisane w plikach z
 * src/lib/richText/ (komendy na Selection/Range API zamiast execCommand,
 * własny stos undo/redo, sanitize-on-write zamiast biblioteki). Ten plik to
 * WYŁĄCZNIE orkiestracja stanu — sam DOM/komendy żyją w commands.ts, sama
 * powierzchnia edycji w EditableSurface.tsx, UI paska w Toolbar.tsx.
 *
 * KRYTYCZNE: `value` (prop) jest czytany TYLKO RAZ, do zbudowania stanu
 * początkowego (historii i EditableSurface) — nigdy nie jest już potem
 * używany do synchronizowania z powrotem w DOM. Zmiana idzie wyłącznie w
 * górę (onChange). To bezpośredni wniosek z wcześniejszego buga #418 przy
 * Tiptap: karmienie kontrolowanej wartości z powrotem do edytora po każdym
 * renderze powodowało pętlę sprzężenia zwrotnego z biblioteką.
 */

type PopoverKind = "none" | "link" | "image" | "columns";

type SelectionSnapshot = {
  blockType: BlockType | null;
  listTag: "ul" | "ol" | null;
  align: TextAlign;
  marks: Record<InlineMark, boolean>;
  collapsed: boolean;
  link: HTMLAnchorElement | null;
};

const DEFAULT_SELECTION: SelectionSnapshot = {
  blockType: "p",
  listTag: null,
  align: "left",
  marks: { strong: false, em: false, u: false },
  collapsed: true,
  link: null,
};

const TYPING_SYNC_DELAY_MS = 500;

/** Pozycja obrazka wśród WSZYSTKICH <img> w edytorze — patrz syncFromDom/restoreFromSnapshot, do odzyskania referencji po podmianie innerHTML. -1, gdy nie znaleziono, zwrócone jako null. */
function indexOfImage(root: HTMLElement, img: HTMLImageElement): number | null {
  const index = Array.from(root.querySelectorAll("img")).indexOf(img);
  return index === -1 ? null : index;
}

/** Odwrotność indexOfImage — obrazek na danej pozycji w ŚWIEŻYM drzewie (po podmianie innerHTML), albo null (usunięty/nie było go). */
function imageAtIndex(root: HTMLElement, index: number | null): HTMLImageElement | null {
  if (index === null) return null;
  return (root.querySelectorAll("img")[index] as HTMLImageElement | undefined) ?? null;
}

export default function RichTextEditor({ label, value, path, session, onChange }: FieldEditorProps) {
  const initialHtml = typeof value === "string" && value.trim() !== "" ? value : "<p><br></p>";

  const editorRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createHistory(initialHtml));
  const savedRangeRef = useRef<Range | null>(null);
  const blockSelectRangeRef = useRef<Range | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [view, setView] = useState<ViewMode>("edit");
  const [popover, setPopover] = useState<PopoverKind>("none");
  /** Obrazek klikany w treści do edycji (patrz handleImageClick) — null, gdy popover wstawia NOWY obrazek zamiast edytować istniejący. */
  const [editingImage, setEditingImage] = useState<HTMLImageElement | null>(null);
  const [html, setHtml] = useState(initialHtml);
  const [historyButtons, setHistoryButtons] = useState({ canUndo: false, canRedo: false });
  const [selection, setSelection] = useState<SelectionSnapshot>(DEFAULT_SELECTION);

  const refreshHistoryButtons = useCallback(() => {
    setHistoryButtons({ canUndo: historyRef.current.canUndo(), canRedo: historyRef.current.canRedo() });
  }, []);

  // Aktualizowane na zmianę zaznaczenia w CAŁYM dokumencie — filtrowane do
  // tego, czy zaznaczenie jest wewnątrz TEGO edytora; poza nim stan paska
  // zostaje przy ostatniej znanej wartości (żeby nie migał przy przejściu
  // fokusu do inputu URL-a w popoverze — patrz saveSelection/restoreSelection).
  const refreshSelectionState = useCallback(() => {
    const root = editorRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !root.contains(sel.getRangeAt(0).commonAncestorContainer)) return;

    setSelection({
      blockType: getActiveBlockType(root),
      listTag: getActiveListTag(root),
      align: getActiveTextAlign(root),
      marks: {
        strong: isMarkActive(root, "strong"),
        em: isMarkActive(root, "em"),
        u: isMarkActive(root, "u"),
      },
      collapsed: sel.isCollapsed,
      link: findAncestorTag(root, "a") as HTMLAnchorElement | null,
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshSelectionState);
    return () => document.removeEventListener("selectionchange", refreshSelectionState);
  }, [refreshSelectionState]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  /**
   * Jedyne miejsce, które czyta DOM, sanityzuje i puszcza wynik w górę —
   * wywoływane po KAŻDEJ zmianie treści, żeby nie powielać tej logiki w
   * komendach paska/pisania/wklejania.
   *
   * sanitizeHtml() zawsze robi pełny przejazd przez DOMParser i zwraca
   * NOWY, ponownie zserializowany string — `root.innerHTML = sanitized`
   * niemal zawsze więc podmienia WSZYSTKIE węzły na świeże klony, odrywając
   * każdą trzymaną gdzieś referencję do konkretnego węzła (np. editingImage)
   * od żywego drzewa. Dla obrazka to realny problem dopiero od paska
   * wyrównania (patrz handleSetAlign): popover trzymał editingImage tylko
   * do JEDNEGO użycia i zaraz go czyścił, ale przyciski wyrównania na pasku
   * działają na TYM SAMYM editingImage wielokrotnie, z popoverem wciąż
   * otwartym — bez poniższego odzyskania referencji drugie kliknięcie
   * wyrównania (i update src/alt/szerokości z popovera po zmianie
   * wyrównania) trafiałoby w osierocony klon i nie miałoby efektu na ekranie.
   */
  const syncFromDom = useCallback(
    (pushHistory: boolean) => {
      const root = editorRef.current;
      if (!root) return;

      const editingImageIndex = editingImage ? indexOfImage(root, editingImage) : null;

      const sanitized = sanitizeHtml(root.innerHTML);
      if (sanitized !== root.innerHTML) {
        root.innerHTML = sanitized;
      }

      if (editingImage) {
        setEditingImage(imageAtIndex(root, editingImageIndex));
      }

      setHtml(sanitized);
      onChange(path, sanitized);

      if (pushHistory) {
        historyRef.current.push(sanitized);
        refreshHistoryButtons();
      }

      refreshSelectionState();
    },
    [editingImage, onChange, path, refreshHistoryButtons, refreshSelectionState]
  );

  function handleTypingChange() {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => syncFromDom(true), TYPING_SYNC_DELAY_MS);
  }

  /** Zapis natychmiastowy (bez czekania na debounce) przy opuszczeniu pola — żeby "Zapisz zmiany" nigdy nie ominęło ostatnich znaków. */
  function handleBlur() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
    syncFromDom(false);
  }

  /**
   * Anuluje ewentualny debounce OCZEKUJĄCY z pisania sprzed chwili (patrz
   * EditableSurface.tsx::isDraggingRef, ten sam powód) — inaczej ten
   * zaplanowany wcześniej `setTimeout(syncFromDom, 500)` mógłby wystrzelić W
   * TRAKCIE aktywnego natywnego przeciągania (np. wolne/wstrzymane
   * przeciąganie obrazka trwające >500ms) i podmienić root.innerHTML pod
   * przeglądarką, która wciąż śledzi węzeł-źródło przeciągania — to
   * realnie zawieszało kartę.
   */
  function handleEditorDragStart() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = undefined;
    }
  }

  /** Natychmiastowa (nie debounced) synchronizacja PO zakończeniu przeciągania — mirror handleBlur, ten sam powód (nie czekać niepotrzebnie 500ms na coś, co już się skończyło). */
  function handleEditorDragEnd() {
    syncFromDom(true);
  }

  /** Obrazek faktycznie przeniesiony (patrz EditableSurface.tsx::handleImageMouseUp -> commands.ts::repositionImage) — ta mutacja DOM dzieje się POZA natywnym wpisywaniem, więc nie przechodzi przez onInput/handleTypingChange; trzeba ją zsynchronizować jawnie, tak jak każdą komendę z paska. */
  function handleImageRepositioned() {
    syncFromDom(true);
  }

  function runCommand(command: (root: HTMLElement) => void) {
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    command(root);
    syncFromDom(true);
  }

  /** Cofnij/ponów też podmienia całe innerHTML — patrz komentarz przy syncFromDom, ten sam powód odzyskania editingImage. */
  function restoreFromSnapshot(snapshot: string) {
    const root = editorRef.current;
    if (!root) return;
    const editingImageIndex = editingImage ? indexOfImage(root, editingImage) : null;
    root.innerHTML = snapshot;
    if (editingImage) setEditingImage(imageAtIndex(root, editingImageIndex));
    setHtml(snapshot);
    onChange(path, snapshot);
    refreshHistoryButtons();
    refreshSelectionState();
  }

  function handleUndo() {
    const previous = historyRef.current.undo();
    if (previous !== null) restoreFromSnapshot(previous);
  }

  function handleRedo() {
    const next = historyRef.current.redo();
    if (next !== null) restoreFromSnapshot(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return;

    const key = event.key.toLowerCase();
    if (key === "z" && event.shiftKey) {
      event.preventDefault();
      handleRedo();
    } else if (key === "z") {
      event.preventDefault();
      handleUndo();
    } else if (key === "y") {
      event.preventDefault();
      handleRedo();
    } else if (key === "b") {
      event.preventDefault();
      runCommand((root) => toggleInlineMark(root, "strong"));
    } else if (key === "i") {
      event.preventDefault();
      runCommand((root) => toggleInlineMark(root, "em"));
    } else if (key === "u") {
      event.preventDefault();
      runCommand((root) => toggleInlineMark(root, "u"));
    }
  }

  function openLinkPopover() {
    const root = editorRef.current;
    if (!root) return;
    savedRangeRef.current = saveSelection(root);
    setPopover("link");
  }

  function openImagePopover() {
    const root = editorRef.current;
    if (!root) return;
    savedRangeRef.current = saveSelection(root);
    setEditingImage(null);
    setPopover("image");
  }

  /** Kliknięcie ISTNIEJĄCEGO obrazka w treści (patrz EditableSurface.tsx::onImageClick) — ten sam popover, w trybie edycji tego konkretnego węzła zamiast wstawiania nowego. */
  function handleImageClick(img: HTMLImageElement) {
    setEditingImage(img);
    setPopover("image");
  }

  function openColumnsPopover() {
    const root = editorRef.current;
    if (!root) return;
    savedRangeRef.current = saveSelection(root);
    setPopover("columns");
  }

  function closePopover() {
    setPopover("none");
    savedRangeRef.current = null;
    setEditingImage(null);
  }

  function handleLinkConfirm(url: string, openInNewTab: boolean) {
    const root = editorRef.current;
    if (!root) return;

    if (selection.link) {
      updateLinkAttributes(selection.link, url, openInNewTab);
    } else {
      restoreSelection(savedRangeRef.current);
      applyLink(root, url, openInNewTab);
    }

    closePopover();
    syncFromDom(true);
  }

  function handleLinkRemove() {
    const root = editorRef.current;
    if (!root || !selection.link) return;
    removeLink(root, selection.link);
    closePopover();
    syncFromDom(true);
  }

  /**
   * syncFromDom() PRZED closePopover(): syncFromDom (gdy editingImage
   * ustawiony) sam robi setEditingImage(refreshed) — patrz jej komentarz —
   * a React zbiera oba wywołania setEditingImage z tego samego handlera w
   * jedną aktualizację, w której wygrywa OSTATNIE. closePopover() musi więc
   * biec jako drugie, żeby jego setEditingImage(null) było tym ostatnim
   * słowem, inaczej po zapisaniu obrazka pasek wyrównania zostałby po cichu
   * "przyklejony" do tego obrazka zamiast wrócić do sterowania tekstem.
   */
  function handleImageConfirm(src: string, alt: string, width: ImageWidth) {
    if (editingImage) {
      updateImageAttributes(editingImage, src, alt, width);
      syncFromDom(true);
      closePopover();
      return;
    }

    const range = savedRangeRef.current;
    if (!range) {
      closePopover();
      return;
    }
    insertImage(range, src, alt, width);
    syncFromDom(true);
    closePopover();
  }

  function handleColumnsConfirm(count: number) {
    const root = editorRef.current;
    if (!root) {
      closePopover();
      return;
    }
    root.focus();
    restoreSelection(savedRangeRef.current);
    insertColumns(root, count);
    closePopover();
    syncFromDom(true);
  }

  /**
   * <select> typu bloku kradnie fokus przeglądarce, w odróżnieniu od
   * przycisków paska (te blokują to przez preventDefault na mousedown — dla
   * <select> to zablokowałoby też otwieranie listy, patrz Toolbar.tsx).
   * Zamiast tego: zapisz zaznaczenie, zanim fokus przejdzie na <select>
   * (mousedown), przywróć je tuż przed wykonaniem komendy (onChange).
   */
  function handleBlockSelectMouseDown() {
    const root = editorRef.current;
    if (root) blockSelectRangeRef.current = saveSelection(root);
  }

  function handleSetBlockType(type: BlockType) {
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    restoreSelection(blockSelectRangeRef.current);
    applyBlockType(root, type);
    syncFromDom(true);
  }

  /**
   * Te same przyciski wyrównania na pasku co dla tekstu — jak w Wordzie:
   * gdy jest "zaznaczony" (aktualnie edytowany, patrz handleImageClick)
   * obrazek, kliknięcie przycisku przesuwa JEGO, zamiast działać na
   * zaznaczeniu tekstu. Patrz getImageAlign/setImageAlign w commands.ts.
   */
  function handleSetAlign(align: TextAlign) {
    if (editingImage) {
      setImageAlign(editingImage, align);
      syncFromDom(true);
      return;
    }
    runCommand((root) => applyTextAlign(root, align));
  }

  const markDisabled = selection.collapsed;
  const linkDisabled = selection.collapsed && !selection.link;
  const blockTypeDisabled = selection.listTag !== null;

  return (
    <div className="overflow-hidden rounded-md border border-zinc-300" onBlur={handleBlur}>
      <Toolbar
        blockType={selection.blockType}
        onSetBlockType={handleSetBlockType}
        onBlockSelectMouseDown={handleBlockSelectMouseDown}
        blockTypeDisabled={blockTypeDisabled}
        marks={selection.marks}
        onToggleMark={(mark) => runCommand((root) => toggleInlineMark(root, mark))}
        markDisabled={markDisabled}
        isBulletList={selection.listTag === "ul"}
        isOrderedList={selection.listTag === "ol"}
        onToggleList={(tag) => runCommand((root) => applyToggleList(root, tag))}
        align={editingImage ? getImageAlign(editingImage) : selection.align}
        onSetAlign={handleSetAlign}
        isLinkActive={selection.link !== null}
        linkDisabled={linkDisabled}
        onOpenLink={openLinkPopover}
        onOpenImage={openImagePopover}
        onOpenColumns={openColumnsPopover}
        canUndo={historyButtons.canUndo}
        canRedo={historyButtons.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        view={view}
        onSetView={setView}
      />

      {popover === "link" && (
        <LinkPopover
          initialUrl={selection.link?.getAttribute("href") ?? ""}
          initialOpenInNewTab={selection.link?.getAttribute("target") === "_blank"}
          isEditing={selection.link !== null}
          onConfirm={handleLinkConfirm}
          onRemove={handleLinkRemove}
          onCancel={closePopover}
        />
      )}

      {popover === "image" && (
        <ImagePopover
          session={session}
          initialUrl={editingImage?.getAttribute("src") ?? ""}
          initialAlt={editingImage?.getAttribute("alt") ?? ""}
          initialWidth={editingImage?.style.width || null}
          isEditing={editingImage !== null}
          onConfirm={handleImageConfirm}
          onCancel={closePopover}
        />
      )}

      {popover === "columns" && <ColumnsPopover onConfirm={handleColumnsConfirm} onCancel={closePopover} />}

      {view === "edit" ? (
        <EditableSurface
          editorRef={editorRef}
          initialHtml={initialHtml}
          ariaLabel={label}
          placeholder="Zacznij pisać artykuł…"
          onChange={handleTypingChange}
          onKeyDown={handleKeyDown}
          onImageClick={handleImageClick}
          onImageRepositioned={handleImageRepositioned}
          onDragStart={handleEditorDragStart}
          onDragEnd={handleEditorDragEnd}
        />
      ) : (
        <HtmlPreview html={html} />
      )}
    </div>
  );
}
