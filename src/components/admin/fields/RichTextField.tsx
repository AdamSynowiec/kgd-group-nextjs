"use client";

import type { FieldEditorProps } from "./types";
import RichTextEditor from "./RichTextEditor";
import InlineRichTextEditor from "./InlineRichTextEditor";

/**
 * Edytor dla type:"richtext". "format": "inline" przy polu (opisy/akapity sekcji) —
 * lekki edytor: pogrubienie, kursywa, podkreślenie, link. Bez "format" — pełny edytor
 * artykułów (nagłówki, listy, obrazki, kolumny: wpis bloga, polityka prywatności).
 */
export default function RichTextField(props: FieldEditorProps) {
  return props.meta?.format === "inline" ? <InlineRichTextEditor {...props} /> : <RichTextEditor {...props} />;
}
