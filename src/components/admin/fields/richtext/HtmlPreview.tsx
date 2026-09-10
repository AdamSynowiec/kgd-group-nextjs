"use client";

import { formatHtmlForDisplay } from "@/lib/richText/formatHtml";

/** Podgląd struktury HTML — tylko do odczytu, zawsze z bieżącej (oczyszczonej) wartości, więc zmiany są widoczne na bieżąco po przełączeniu widoku. */
export default function HtmlPreview({ html }: { html: string }) {
  const formatted = formatHtmlForDisplay(html);

  return (
    <pre className="min-h-[220px] overflow-x-auto rounded-b-md bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-zinc-100">
      <code>{formatted === "" ? "(pusty artykuł)" : formatted}</code>
    </pre>
  );
}
