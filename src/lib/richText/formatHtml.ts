/**
 * Czysto tekstowe "upiększanie" HTML-a na potrzeby podglądu struktury
 * (src/components/admin/fields/richtext/HtmlPreview.tsx) — jeden tag na
 * linię, wcięcia wg głębokości zagnieżdżenia. Celowo bez parsowania DOM-em
 * (to tylko podgląd, nie źródło prawdy) — dzięki temu jest to czysta funkcja
 * na stringu, testowalna node:test, bez zależności od przeglądarki.
 */
const VOID_OR_INLINE_SELF_CONTAINED = /^<(br|img)\b[^>]*\/?>$/i;
const OPENING_TAG_ONLY = /^<([a-z][a-z0-9]*)(\s[^>]*)?>$/i;
const OPEN_AND_CLOSE_SAME_LINE = /^<([a-z][a-z0-9]*)[^>]*>.*<\/\1>$/i;
const CLOSING_TAG = /^<\//;

export function formatHtmlForDisplay(html: string): string {
  const trimmed = html.trim();
  if (trimmed === "") return "";

  const lines = trimmed.replace(/></g, ">\n<").split("\n");
  let depth = 0;
  const result: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") continue;

    if (CLOSING_TAG.test(line)) {
      depth = Math.max(0, depth - 1);
    }

    result.push("  ".repeat(depth) + line);

    const isOpeningOnly = OPENING_TAG_ONLY.test(line);
    const isSelfContained = VOID_OR_INLINE_SELF_CONTAINED.test(line) || OPEN_AND_CLOSE_SAME_LINE.test(line);
    if (isOpeningOnly && !isSelfContained) {
      depth += 1;
    }
  }

  return result.join("\n");
}
