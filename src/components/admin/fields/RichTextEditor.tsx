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
  canMoveImage,
  findAncestorTag,
  getActiveBlockType,
  getActiveListTag,
  getActiveTextAlign,
  insertColumns,
  insertImage,
  isMarkActive,
  moveImage,
  removeLink,
  restoreSelection,
  saveSelection,
  setBlockType as applyBlockType,
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
  /** Czy editingImage ma sąsiedni blok w danym kierunku — wyliczane W HANDLERACH (handleImageClick/handleImageMove), NIE podczas renderu: odczyt editorRef.current w JSX łamie regułę react-hooks/refs. */
  const [imageMoveAvailability, setImageMoveAvailability] = useState({ up: false, down: false });
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

  /** Jedyne miejsce, które czyta DOM, sanityzuje i puszcza wynik w górę — wywoływane po KAŻDEJ zmianie treści, żeby nie powielać tej logiki w komendach paska/pisania/wklejania. */
  const syncFromDom = useCallback(
    (pushHistory: boolean) => {
      const root = editorRef.current;
      if (!root) return;

      const sanitized = sanitizeHtml(root.innerHTML);
      if (sanitized !== root.innerHTML) {
        root.innerHTML = sanitized;
      }

      setHtml(sanitized);
      onChange(path, sanitized);

      if (pushHistory) {
        historyRef.current.push(sanitized);
        refreshHistoryButtons();
      }

      refreshSelectionState();
    },
    [onChange, path, refreshHistoryButtons, refreshSelectionState]
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

  function runCommand(command: (root: HTMLElement) => void) {
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    command(root);
    syncFromDom(true);
  }

  function restoreFromSnapshot(snapshot: string) {
    const root = editorRef.current;
    if (!root) return;
    root.innerHTML = snapshot;
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
    const root = editorRef.current;
    setImageMoveAvailability(root ? { up: canMoveImage(root, img, "up"), down: canMoveImage(root, img, "down") } : { up: false, down: false });
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
    setImageMoveAvailability({ up: false, down: false });
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

  function handleImageConfirm(src: string, alt: string, width: ImageWidth) {
    if (editingImage) {
      updateImageAttributes(editingImage, src, alt, width);
      closePopover();
      syncFromDom(true);
      return;
    }

    const range = savedRangeRef.current;
    if (!range) {
      closePopover();
      return;
    }
    insertImage(range, src, alt, width);
    closePopover();
    syncFromDom(true);
  }

  /**
   * Deterministyczna alternatywa dla natywnego przeciągania obrazka (patrz
   * commands.ts::insertImage, dlaczego drag&drop jest wyłączone) — przenosi
   * NATYCHMIAST, popover zostaje otwarty (można kliknąć "wyżej/niżej"
   * wielokrotnie pod rząd).
   *
   * syncFromDom() PODMIENIA root.innerHTML (sanitize-on-write) — stary węzeł
   * `editingImage` staje się odłączony od żywego DOM-u, więc kolejne
   * kliknięcie działałoby na duchu, nie na czymś realnym. Po synchronizacji
   * odnajdujemy TEN SAM obrazek na nowo po src+alt (jedyne stabilne
   * identyfikatory, jakie ma — wystarczające, dopóki artykuł nie ma dwóch
   * identycznych obrazków z tym samym alt).
   */
  function handleImageMove(direction: "up" | "down") {
    const root = editorRef.current;
    if (!root || !editingImage) return;

    const src = editingImage.getAttribute("src");
    const alt = editingImage.getAttribute("alt");

    moveImage(root, editingImage, direction);
    syncFromDom(true);

    const refreshedImage = Array.from(root.querySelectorAll("img")).find(
      (candidate) => candidate.getAttribute("src") === src && candidate.getAttribute("alt") === alt
    );
    if (refreshedImage) {
      setEditingImage(refreshedImage);
      setImageMoveAvailability({ up: canMoveImage(root, refreshedImage, "up"), down: canMoveImage(root, refreshedImage, "down") });
    }
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
        align={selection.align}
        onSetAlign={(align) => runCommand((root) => applyTextAlign(root, align))}
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
          canMoveUp={imageMoveAvailability.up}
          canMoveDown={imageMoveAvailability.down}
          onMove={handleImageMove}
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
          onDragStart={handleEditorDragStart}
          onDragEnd={handleEditorDragEnd}
        />
      ) : (
        <HtmlPreview html={html} />
      )}
    </div>
  );
}
