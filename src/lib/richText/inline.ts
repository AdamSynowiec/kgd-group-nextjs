/**
 * Formatowanie "w linii" dla pól opisów (type "richtext" + format "inline", patrz
 * src/components/admin/fields/InlineRichTextEditor.tsx): pogrubienie, kursywa,
 * podkreślenie, link. Akapity/łamania linii to zwykłe "\n" w tekście (komponenty
 * stron renderują je przez whitespace-pre-line / dzielą na akapity jak dotąd).
 *
 * BEZPIECZEŃSTWO: wartość z bazy NIGDY nie trafia do dangerouslySetInnerHTML.
 * parseInline() zamienia string na drzewo węzłów z białej listy (strong, em, u, a, br);
 * każdy inny tag jest pomijany (zostaje jego tekst), atrybuty poza "href"/"target"
 * linku są odrzucane, a href przechodzi isSafeUrl() (http/https/mailto/tel/ścieżki
 * względne — bez javascript:, data: itd.). RichInline.tsx renderuje to drzewo jako
 * elementy React, więc tekst jest zawsze escapowany przez Reacta. Działa tak samo
 * na serwerze (build Next.js) i w przeglądarce — bez DOMParsera.
 *
 * Zwykły tekst bez tagów (wszystkie dotychczasowe wartości) daje identyczny wynik
 * jak wcześniej `{text}`.
 */

export type InlineMarkTag = "strong" | "em" | "u";

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "br" }
  | { type: InlineMarkTag; children: InlineNode[] }
  | { type: "a"; href: string; newTab: boolean; children: InlineNode[] };

type ContainerNode = Extract<InlineNode, { children: InlineNode[] }>;

/** Aliasy tagów (z wklejonego HTML-a albo starszych edytorów) -> tag docelowy. */
const MARK_ALIASES: Partial<Record<string, InlineMarkTag>> ={ strong: "strong", b: "strong", em: "em", i: "em", u: "u" };

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Bezpieczny adres linku: http(s), mailto, tel albo ścieżka względna ("/oferta", "#kontakt"). */
export function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  // Znaki sterujące/białe w środku schematu ("java\tscript:") — odrzucamy cały adres.
  if (trimmed === "" || /[\u0000-\u001f]/.test(trimmed)) return false;
  if (/^[/#?]/.test(trimmed) && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("//")) return false;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!scheme) return !trimmed.includes(":");
  return ["http", "https", "mailto", "tel"].includes(scheme[1].toLowerCase());
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1] === "x" || entity[1] === "X" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttribute(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}

function attribute(attrs: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`, "i").exec(attrs);
  if (!match) return null;
  return decodeEntities(match[1] ?? match[2] ?? match[3] ?? "");
}

// Atrybuty w cudzysłowach mogą zawierać "<" i ">" — dlatego alternatywa "[^"]*" / '[^']*'.
const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+(?:[^<>"']|"[^"]*"|'[^']*')*?)?)\s*(\/?)>|<!--[\s\S]*?-->/g;

/** Tagi, których treść NIE jest tekstem do pokazania (wycinane w całości razem z zawartością). */
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math", "textarea", "select"]);

export function parseInline(source: string): InlineNode[] {
  const root: InlineNode[] = [];
  const stack: { tag: string; node: ContainerNode }[] = [];
  const current = () => (stack.length > 0 ? stack[stack.length - 1].node.children : root);

  const pushText = (raw: string) => {
    if (raw === "") return;
    const text = decodeEntities(raw);
    const list = current();
    const last = list[list.length - 1];
    if (last && last.type === "text") last.text += text;
    else list.push({ type: "text", text });
  };

  let index = 0;
  let dropUntil: string | null = null;
  TAG_PATTERN.lastIndex = 0;
  for (let match = TAG_PATTERN.exec(source); match !== null; match = TAG_PATTERN.exec(source)) {
    const before = source.slice(index, match.index);
    index = TAG_PATTERN.lastIndex;
    if (dropUntil === null) pushText(before);
    if (match[2] === undefined) continue; // komentarz HTML

    const closing = match[1] === "/";
    const name = match[2].toLowerCase();

    if (dropUntil !== null) {
      if (closing && name === dropUntil) dropUntil = null;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && match[4] !== "/") dropUntil = name;
      continue;
    }

    if (name === "br") {
      current().push({ type: "br" });
      continue;
    }
    // Bloki (akapity/divy z wklejek) -> podział linii, jak w edytorze.
    if (name === "p" || name === "div") {
      if (closing) {
        current().push({ type: "text", text: "\n" });
      }
      continue;
    }

    const mark = MARK_ALIASES[name];
    const tag = mark ?? (name === "a" ? "a" : null);
    if (tag === null) continue; // nieznany tag: pomijamy sam tag, tekst zostaje

    if (closing) {
      const at = stack.map((entry) => entry.tag).lastIndexOf(tag);
      if (at !== -1) stack.length = at;
      continue;
    }

    let node: ContainerNode;
    if (tag === "a") {
      const href = (attribute(match[3] ?? "", "href") ?? "").trim();
      if (!isSafeLinkUrl(href)) {
        // Niebezpieczny/pusty adres: link znika, jego tekst zostaje. Wpis "przezroczysty" na stosie
        // (children = lista rodzica, węzeł nie trafia do drzewa) — tak, żeby </a> zamknęło właściwy poziom.
        stack.push({ tag: "a", node: { type: "em", children: current() } });
        continue;
      }
      node = { type: "a", href, newTab: (attribute(match[3] ?? "", "target") ?? "") === "_blank", children: [] };
    } else {
      node = { type: tag, children: [] };
    }
    current().push(node);
    stack.push({ tag, node });
    if (match[4] === "/") stack.pop();
  }
  if (dropUntil === null) pushText(source.slice(index));

  return root;
}

/** Sam tekst (bez znaczników) — do meta-opisów, alt, aria-label, porównań. */
export function inlineToPlainText(source: string): string {
  const walk = (nodes: InlineNode[]): string =>
    nodes.map((node) => (node.type === "text" ? node.text : node.type === "br" ? "\n" : walk(node.children))).join("");
  return walk(parseInline(source));
}

/** Czy wartość zawiera jakiekolwiek formatowanie (inaczej można ją pokazać jako zwykły tekst). */
export function hasInlineMarkup(source: string): boolean {
  return /<\/?[a-zA-Z]/.test(source) || /&(#x?[0-9a-f]+|[a-z]+);/i.test(source);
}

/** Kanoniczny zapis drzewa (tylko dozwolone tagi, atrybuty escapowane) — używany przez edytor w panelu. */
export function serializeInline(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return escapeText(node.text);
        case "br":
          return "\n";
        case "a": {
          const target = node.newTab ? ' target="_blank" rel="noopener noreferrer"' : "";
          return `<a href="${escapeAttribute(node.href)}"${target}>${serializeInline(node.children)}</a>`;
        }
        default:
          return `<${node.type}>${serializeInline(node.children)}</${node.type}>`;
      }
    })
    .join("");
}
