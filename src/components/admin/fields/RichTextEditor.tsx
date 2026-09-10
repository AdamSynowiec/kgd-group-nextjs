"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { FieldEditorProps } from "./types";
import EditableSurface from "./richtext/EditableSurface";
import Toolbar, { type ViewMode } from "./richtext/Toolbar";
import LinkPopover from "./richtext/LinkPopover";
import ImagePopover from "./richtext/ImagePopover";
import HtmlPreview from "./richtext/HtmlPreview";
import { sanitizeHtml } from "@/lib/richText/sanitizeHtml";
import { createHistory } from "@/lib/richText/history";
import {
  applyLink,
  findAncestorTag,
  getActiveBlockType,
  getActiveListTag,
  insertImage,
  isMarkActive,
  removeLink,
  restoreSelection,
  saveSelection,
  setBlockType as applyBlockType,
  toggleInlineMark,
  toggleList as applyToggleList,
  updateLinkAttributes,
  type BlockType,
  type InlineMark,
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

type PopoverKind = "none" | "link" | "image";

type SelectionSnapshot = {
  blockType: BlockType | null;
  listTag: "ul" | "ol" | null;
  marks: Record<InlineMark, boolean>;
  collapsed: boolean;
  link: HTMLAnchorElement | null;
};

const DEFAULT_SELECTION: SelectionSnapshot = {
  blockType: "p",
  listTag: null,
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
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [view, setView] = useState<ViewMode>("edit");
  const [popover, setPopover] = useState<PopoverKind>("none");
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
    setPopover("image");
  }

  function closePopover() {
    setPopover("none");
    savedRangeRef.current = null;
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

  function handleImageConfirm(src: string, alt: string) {
    const range = savedRangeRef.current;
    if (!range) {
      closePopover();
      return;
    }
    insertImage(range, src, alt);
    closePopover();
    syncFromDom(true);
  }

  const markDisabled = selection.collapsed;
  const linkDisabled = selection.collapsed && !selection.link;
  const blockTypeDisabled = selection.listTag !== null;

  return (
    <div className="overflow-hidden rounded-md border border-zinc-300" onBlur={handleBlur}>
      <Toolbar
        blockType={selection.blockType}
        onSetBlockType={(type) => runCommand((root) => applyBlockType(root, type))}
        blockTypeDisabled={blockTypeDisabled}
        marks={selection.marks}
        onToggleMark={(mark) => runCommand((root) => toggleInlineMark(root, mark))}
        markDisabled={markDisabled}
        isBulletList={selection.listTag === "ul"}
        isOrderedList={selection.listTag === "ol"}
        onToggleList={(tag) => runCommand((root) => applyToggleList(root, tag))}
        isLinkActive={selection.link !== null}
        linkDisabled={linkDisabled}
        onOpenLink={openLinkPopover}
        onOpenImage={openImagePopover}
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

      {popover === "image" && <ImagePopover session={session} onConfirm={handleImageConfirm} onCancel={closePopover} />}

      {view === "edit" ? (
        <EditableSurface
          editorRef={editorRef}
          initialHtml={initialHtml}
          ariaLabel={label}
          placeholder="Zacznij pisać artykuł…"
          onChange={handleTypingChange}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <HtmlPreview html={html} />
      )}
    </div>
  );
}
