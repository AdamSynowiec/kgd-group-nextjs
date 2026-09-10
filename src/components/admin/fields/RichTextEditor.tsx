"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { RICH_TEXT_CONTENT_CLASS } from "@/lib/richTextStyles";
import type { FieldEditorProps } from "./types";

type BlockType = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "p", label: "Akapit" },
  { value: "h1", label: "Nagłówek 1" },
  { value: "h2", label: "Nagłówek 2" },
  { value: "h3", label: "Nagłówek 3" },
  { value: "h4", label: "Nagłówek 4" },
  { value: "h5", label: "Nagłówek 5" },
  { value: "h6", label: "Nagłówek 6" },
];

const toolbarButtonClass = (active: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors ${
    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;

/**
 * Edytor dla type:"richtext" — WYSIWYG (Tiptap/ProseMirror): to, co redaktor
 * widzi podczas edycji (kliknięcie w akapit -> "Nagłówek 2" w pasku -> tekst
 * od razu wygląda jak nagłówek), jest jednocześnie podglądem, dokładnie tak
 * jak wygląda potem na stronie (ten sam RICH_TEXT_CONTENT_CLASS co
 * BlogPostTemplate.tsx). Żadnego osobnego trybu "surowy HTML".
 *
 * Wartość pola to string z (oczyszczonym) HTML-em — ten sam kształt co
 * type:"string", ale semantycznie sformatowany tekst, nie zwykły tekst.
 * DOMPurify oczyszcza wyjście PRZY KAŻDEJ zmianie (nie dopiero przy
 * zapisie) — edytor kontenteditable renderuje bezpośrednio to, co odda
 * przeglądarka, więc czyszczenie musi nastąpić zanim ta wartość wróci przez
 * onChange do reszty panelu / bazy.
 */
export default function RichTextEditor({ label, value, path, onChange }: FieldEditorProps) {
  const initialContent = typeof value === "string" ? value : "";

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    // SSR (Next.js) — bez tego Tiptap próbuje renderować na serwerze i psuje hydrację.
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      onChange(path, DOMPurify.sanitize(instance.getHTML()));
    },
    editorProps: {
      attributes: {
        "aria-label": label,
        class: `${RICH_TEXT_CONTENT_CLASS} min-h-[220px] rounded-b-md px-3 py-2 text-sm focus:outline-none`,
      },
    },
  });

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance) return null;

      const blockType: BlockType = ([1, 2, 3, 4, 5, 6] as const).reduce<BlockType>(
        (found, level) => (found !== "p" ? found : instance.isActive("heading", { level }) ? (`h${level}` as BlockType) : "p"),
        "p"
      );

      return {
        blockType,
        isBulletList: instance.isActive("bulletList"),
        isOrderedList: instance.isActive("orderedList"),
        isBold: instance.isActive("bold"),
        isItalic: instance.isActive("italic"),
        isBlockquote: instance.isActive("blockquote"),
      };
    },
  });

  if (!editor || !toolbarState) {
    return <div className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-400">Ładowanie edytora…</div>;
  }

  function setBlockType(type: BlockType) {
    if (type === "p") {
      editor!.chain().focus().setParagraph().run();
    } else {
      editor!.chain().focus().setHeading({ level: Number(type.slice(1)) as 1 | 2 | 3 | 4 | 5 | 6 }).run();
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-zinc-300">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <select
          value={toolbarState.blockType}
          onChange={(event) => setBlockType(event.target.value as BlockType)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm"
          aria-label="Typ bloku (akapit / nagłówek)"
        >
          {BLOCK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolbarButtonClass(toolbarState.isBold)}
          aria-label="Pogrubienie"
        >
          <span className="font-bold">B</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolbarButtonClass(toolbarState.isItalic)}
          aria-label="Kursywa"
        >
          <span className="italic">I</span>
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-200" aria-hidden />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={toolbarButtonClass(toolbarState.isBulletList)}
          aria-label="Lista punktowana"
          title="Lista punktowana"
        >
          • Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={toolbarButtonClass(toolbarState.isOrderedList)}
          aria-label="Lista numerowana"
          title="Lista numerowana"
        >
          1. Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={toolbarButtonClass(toolbarState.isBlockquote)}
          aria-label="Cytat"
          title="Cytat"
        >
          &ldquo;Cytat&rdquo;
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
