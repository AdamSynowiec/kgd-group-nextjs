"use client";

import { useCallback, useEffect, useId, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { FieldEditorProps } from "./types";
import { createHistory } from "@/lib/richText/history";
import { findAncestorTag, isMarkActive, restoreSelection, saveSelection, toggleInlineMark, type InlineMark } from "@/lib/richText/commands";
import { inlineToPlainText, isSafeLinkUrl, parseInline, serializeInline, type InlineNode } from "@/lib/richText/inline";

/**
 * Lekki edytor pól opisów: type "richtext" + "format": "inline" (patrz RichTextField.tsx).
 * Tylko to, co ma sens w akapicie na stronie: pogrubienie, kursywa, podkreślenie, link.
 * Enter = nowa linia (zapisywana jako "\n", jak dotąd w zwykłych polach), wklejanie zawsze
 * jako czysty tekst (bez stylów z Worda/stron). Zapis: kanoniczny HTML z białej listy
 * (serializeInline), na stronie renderowany bezpiecznie przez RichInline.tsx.
 */

const SYNC_DELAY_MS = 400;
const MARKS: { mark: InlineMark; label: string; shortcut: string; content: ReactNode }[] = [
  { mark: "strong", label: "Pogrubienie", shortcut: "Ctrl+B", content: <span className="font-bold">B</span> },
  { mark: "em", label: "Kursywa", shortcut: "Ctrl+I", content: <span className="font-serif italic">I</span> },
  { mark: "u", label: "Podkreślenie", shortcut: "Ctrl+U", content: <span className="underline underline-offset-2">U</span> },
];

/** Wartość z bazy -> HTML do contentEditable ("\n" -> <br>, tylko dozwolone tagi). */
function toEditorHtml(value: string): string {
  const html = serializeInline(parseInline(value)).replace(/\n/g, "<br>");
  // Pusta ostatnia linia jest w contentEditable niewidoczna bez dodatkowego <br>.
  return html.endsWith("<br>") ? `${html}<br>` : html;
}

/** DOM edytora -> drzewo węzłów (nieznane tagi z przeglądarki/wklejek: zostaje sam tekst). */
function readNodes(parent: Node): InlineNode[] {
  const out: InlineNode[] = [];
  parent.childNodes.forEach((child, index) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? "").replace(/​/g, "");
      if (text !== "") out.push({ type: "text", text });
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const element = child as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "br") {
      out.push({ type: "br" });
      return;
    }
    const children = readNodes(element);
    if (tag === "div" || tag === "p") {
      // Chrome/Safari potrafią wstawić <div> zamiast <br> — traktujemy jak nową linię.
      if (index > 0) out.push({ type: "br" });
      out.push(...children);
      return;
    }
    if (tag === "strong" || tag === "b") out.push({ type: "strong", children });
    else if (tag === "em" || tag === "i") out.push({ type: "em", children });
    else if (tag === "u") out.push({ type: "u", children });
    else if (tag === "a" && isSafeLinkUrl(element.getAttribute("href") ?? "")) {
      out.push({ type: "a", href: (element.getAttribute("href") ?? "").trim(), newTab: element.getAttribute("target") === "_blank", children });
    } else out.push(...children);
  });
  return out;
}

/** Zapisywana wartość: kanoniczny HTML, końcowe puste linie obcięte, puste znaczniki usunięte. */
function serializeEditor(root: HTMLElement): string {
  return serializeInline(readNodes(root))
    .replace(/<(strong|em|u)><\/\1>/g, "")
    .replace(/\n+$/, "");
}

/** "www.x.pl" / "x.pl/oferta" -> https://…, "a@b.pl" -> mailto:, "+48 600 100 200" -> tel: */
export function normalizeLinkInput(input: string): string {
  const value = input.trim();
  if (value === "") return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) || /^[/#?]/.test(value)) return value;
  if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(value)) return `mailto:${value}`;
  if (/^\+?[\d\s()-]{7,}$/.test(value)) return `tel:${value.replace(/[\s()-]/g, "")}`;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(value)) return `https://${value}`;
  return value;
}

type Selection = { marks: Record<InlineMark, boolean>; collapsed: boolean; link: HTMLAnchorElement | null; inside: boolean };

export default function InlineRichTextEditor({ label, value, path, onChange }: FieldEditorProps) {
  const initial = typeof value === "string" ? value : String(value ?? "");
  const editorRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef(createHistory(toEditorHtml(initial)));
  const savedRangeRef = useRef<Range | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastValueRef = useRef(initial);
  const [selection, setSelection] = useState<Selection>({ marks: { strong: false, em: false, u: false }, collapsed: true, link: null, inside: false });
  const [linkOpen, setLinkOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [empty, setEmpty] = useState(initial.trim() === "");

  // Treść ustawiana RAZ (jak w RichTextEditor.tsx) — dalej edytor jest jedynym źródłem prawdy, zmiany idą tylko w górę.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = toEditorHtml(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSelection = useCallback(() => {
    const root = editorRef.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0 || !root.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
    setSelection({
      marks: { strong: isMarkActive(root, "strong"), em: isMarkActive(root, "em"), u: isMarkActive(root, "u") },
      collapsed: sel.isCollapsed,
      link: findAncestorTag(root, "a") as HTMLAnchorElement | null,
      inside: true,
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshSelection);
    return () => {
      document.removeEventListener("selectionchange", refreshSelection);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refreshSelection]);

  const sync = useCallback(
    (pushHistory: boolean) => {
      const root = editorRef.current;
      if (!root) return;
      const next = serializeEditor(root);
      setEmpty(next.trim() === "");
      if (next !== lastValueRef.current) {
        lastValueRef.current = next;
        onChange(path, next);
      }
      if (pushHistory) historyRef.current.push(root.innerHTML);
      refreshSelection();
    },
    [onChange, path, refreshSelection]
  );

  function scheduleSync() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => sync(true), SYNC_DELAY_MS);
  }

  function run(command: (root: HTMLElement) => void) {
    const root = editorRef.current;
    if (!root) return;
    root.focus();
    command(root);
    sync(true);
  }

  function restore(snapshot: string | null) {
    const root = editorRef.current;
    if (!root || snapshot === null) return;
    root.innerHTML = snapshot;
    sync(false);
  }

  function insertAtCaret(nodes: Node[]) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => fragment.appendChild(node));
    const last = nodes[nodes.length - 1];
    range.insertNode(fragment);
    // <br> na samym końcu edytora jest niewidoczny — dokładamy drugi, żeby kursor przeszedł do nowej linii.
    if (last instanceof HTMLBRElement && !last.nextSibling && last.parentNode === editorRef.current) {
      last.after(document.createElement("br"));
    }
    if (last) {
      const after = document.createRange();
      after.setStartAfter(last);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      insertAtCaret([document.createElement("br")]);
      scheduleSync();
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) return;
    const key = event.key.toLowerCase();
    const shortcut: Partial<Record<string, () => void>> = {
      b: () => !selection.collapsed && run((root) => toggleInlineMark(root, "strong")),
      i: () => !selection.collapsed && run((root) => toggleInlineMark(root, "em")),
      u: () => !selection.collapsed && run((root) => toggleInlineMark(root, "u")),
      k: () => openLink(),
      z: () => restore(event.shiftKey ? historyRef.current.redo() : historyRef.current.undo()),
      y: () => restore(historyRef.current.redo()),
    };
    const action = shortcut[key];
    if (action) {
      event.preventDefault();
      action();
    }
  }

  /** Wklejanie zawsze jako czysty tekst — bez czcionek, kolorów i śmieci z Worda/stron. */
  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n");
    if (text === "") return;
    const nodes: Node[] = [];
    text.split("\n").forEach((line, index) => {
      if (index > 0) nodes.push(document.createElement("br"));
      if (line !== "") nodes.push(document.createTextNode(line));
    });
    insertAtCaret(nodes);
    sync(true);
  }

  function openLink() {
    const root = editorRef.current;
    if (!root) return;
    if (selection.collapsed && !selection.link) return;
    savedRangeRef.current = saveSelection(root);
    setLinkOpen(true);
  }

  function confirmLink(url: string, newTab: boolean) {
    const root = editorRef.current;
    if (!root) return;
    const anchor = selection.link;
    if (anchor) {
      anchor.setAttribute("href", url);
      if (newTab) anchor.setAttribute("target", "_blank");
      else anchor.removeAttribute("target");
    } else {
      root.focus();
      restoreSelection(savedRangeRef.current);
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const created = document.createElement("a");
        created.setAttribute("href", url);
        if (newTab) created.setAttribute("target", "_blank");
        created.appendChild(range.extractContents());
        range.insertNode(created);
      }
    }
    setLinkOpen(false);
    sync(true);
  }

  function removeLink() {
    const anchor = selection.link;
    if (!anchor || !anchor.parentNode) return;
    while (anchor.firstChild) anchor.parentNode.insertBefore(anchor.firstChild, anchor);
    anchor.remove();
    setLinkOpen(false);
    sync(true);
  }

  function clearFormatting() {
    const root = editorRef.current;
    if (!root) return;
    // Sam tekst jako jeden węzeł tekstowy (escapowany) — "<" wpisane w treści nie staje się tagiem.
    const text = inlineToPlainText(serializeEditor(root));
    root.innerHTML = toEditorHtml(serializeInline([{ type: "text", text }]));
    sync(true);
  }

  const keepFocus = (event: MouseEvent) => event.preventDefault();
  const markDisabled = selection.collapsed;
  const linkDisabled = selection.collapsed && !selection.link;
  const hint = !selection.inside || !focused ? null : selection.link ? "Kursor w linku — kliknij ikonę linku, żeby go zmienić lub usunąć." : markDisabled ? "Zaznacz fragment tekstu, żeby go pogrubić, wyróżnić albo dodać link." : null;

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition ${focused ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-zinc-200 hover:border-zinc-300"}`}
    >
      <div role="toolbar" aria-label={`Formatowanie: ${label}`} className="flex items-center gap-0.5 border-b border-zinc-100 bg-zinc-50/70 px-1.5 py-1">
        {MARKS.map(({ mark, label: markLabel, shortcut, content }) => (
          <ToolButton
            key={mark}
            label={`${markLabel} (${shortcut})`}
            active={selection.marks[mark]}
            disabled={markDisabled}
            onMouseDown={keepFocus}
            onClick={() => run((root) => toggleInlineMark(root, mark))}
          >
            {content}
          </ToolButton>
        ))}
        <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden />
        <ToolButton label={selection.link ? "Edytuj link (Ctrl+K)" : "Dodaj link (Ctrl+K)"} active={selection.link !== null} disabled={linkDisabled} onMouseDown={keepFocus} onClick={openLink}>
          <LinkGlyph />
        </ToolButton>
        <span className="mx-1 h-4 w-px bg-zinc-200" aria-hidden />
        <ToolButton label="Wyczyść formatowanie (zostaje sam tekst)" active={false} disabled={empty} onMouseDown={keepFocus} onClick={clearFormatting}>
          <ClearGlyph />
        </ToolButton>
        {hint && <span className="ml-auto hidden truncate pr-1 text-[11px] text-zinc-400 sm:block">{hint}</span>}
      </div>

      {linkOpen && (
        <LinkForm
          initialUrl={selection.link?.getAttribute("href") ?? ""}
          initialNewTab={selection.link?.getAttribute("target") === "_blank"}
          editing={selection.link !== null}
          onConfirm={confirmLink}
          onRemove={removeLink}
          onCancel={() => {
            setLinkOpen(false);
            editorRef.current?.focus();
            restoreSelection(savedRangeRef.current);
          }}
        />
      )}

      <div className="relative">
        {empty && !focused && <span className="pointer-events-none absolute left-3 top-2 text-sm text-zinc-400">Wpisz tekst…</span>}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={scheduleSync}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={(event) => event.preventDefault()}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (timerRef.current) clearTimeout(timerRef.current);
            sync(false);
          }}
          className="min-h-[4.5rem] max-h-[22rem] overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none [&_a]:text-indigo-700 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold"
        />
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  onMouseDown,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  onMouseDown: (event: MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={disabled ? `${label} — najpierw zaznacz tekst` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={onMouseDown}
      onClick={onClick}
      className={`grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function LinkForm({
  initialUrl,
  initialNewTab,
  editing,
  onConfirm,
  onRemove,
  onCancel,
}: {
  initialUrl: string;
  initialNewTab: boolean;
  editing: boolean;
  onConfirm: (url: string, newTab: boolean) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [url, setUrl] = useState(initialUrl);
  const [newTab, setNewTab] = useState(initialNewTab);
  const [error, setError] = useState("");
  const normalized = normalizeLinkInput(url);

  function submit() {
    if (!isSafeLinkUrl(normalized)) {
      setError("Ten adres nie zadziała. Wpisz np. kgd-group.pl/oferta, /kontakt, adres e-mail albo numer telefonu.");
      return;
    }
    onConfirm(normalized, newTab);
  }

  return (
    <div className="border-b border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-url`} className="sr-only">
          Adres linku
        </label>
        <input
          id={`${id}-url`}
          type="text"
          inputMode="url"
          autoFocus
          value={url}
          placeholder="np. kgd-group.pl/oferta, /kontakt, biuro@kgd-group.pl"
          aria-invalid={error !== ""}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            setUrl(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          className="min-w-[14rem] flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
        />
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          <input type="checkbox" checked={newTab} onChange={(event) => setNewTab(event.target.checked)} className="h-3.5 w-3.5 rounded border-zinc-300" />
          W nowej karcie
        </label>
        <button type="button" onClick={submit} disabled={url.trim() === ""} className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40">
          {editing ? "Zapisz" : "Dodaj link"}
        </button>
        {editing && (
          <button type="button" onClick={onRemove} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50">
            Usuń link
          </button>
        )}
        <button type="button" onClick={onCancel} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200/60">
          Anuluj
        </button>
      </div>
      <p id={`${id}-help`} role={error ? "alert" : undefined} className={`mt-1.5 text-[11px] ${error ? "text-red-600" : "text-zinc-500"}`}>
        {error || (url.trim() !== "" && normalized !== url.trim() ? <>Link poprowadzi do: <span className="font-mono">{normalized}</span></> : "Enter — zatwierdź, Esc — anuluj.")}
      </p>
    </div>
  );
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
    </svg>
  );
}

function ClearGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="h-4 w-4" aria-hidden>
      <path d="M5 4h10M10 4l-3 12" />
      <path d="M12.5 12.5l4 4M16.5 12.5l-4 4" />
    </svg>
  );
}
