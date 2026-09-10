/**
 * Własny sanitizer HTML-a z edytora artykułów (src/components/admin/fields/RichTextEditor.tsx)
 * — bez biblioteki (żądanie: "bez używania zewnętrznych bibliotek"). Działa
 * przez DOMParser, więc jest wyłącznie PRZEGLĄDAROWY (importowany tylko z
 * komponentów "use client" — analogicznie jak wcześniej DOMPurify).
 *
 * Uruchamiane PRZY KAŻDEJ zmianie w edytorze, zanim wartość trafi przez
 * onChange w górę (sanitize-on-write) — ten sam moment i ta sama zasada, co
 * wcześniej DOMPurify.sanitize(); backend (EditableMerge.php) nadal ufa
 * zalogowanemu redaktorowi tak samo jak przy każdym innym polu treści.
 */

/** Tagi dozwolone w treści artykułu — dokładnie te, które potrafi wytworzyć ten edytor. */
const ALLOWED_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br",
  "strong", "em", "u",
  "a", "img",
  "ul", "ol", "li",
  "blockquote",
]);

/** Atrybuty dozwolone per-tag — wszystko inne (w tym "style", "class", "on*") jest odrzucane. */
const ALLOWED_ATTRIBUTES: Record<string, readonly string[]> = {
  a: ["href", "rel", "target"],
  img: ["src", "alt"],
};

/** Tagi, które trzeba usunąć RAZEM z zawartością (nie tylko rozpakować) — realny wektor XSS. */
const STRIP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "noscript"]);

/**
 * Bezpieczne schematy adresu — blokuje "javascript:", "data:" i inne wektory
 * wstrzyknięcia przez href/src. Ścieżki względne ("/...", "#...", "?...")
 * i adresy bez schematu (np. "przyklad.pl/x" potraktowane jako względne przez
 * przeglądarkę) też są dozwolone.
 */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return false;

  // Względne: "/coś", "#kotwica", "?query", "./coś" — bez schematu, bezpieczne z definicji.
  if (/^[/#?.]/.test(trimmed)) return true;

  // Bez "://" i bez ":" na początku pierwszego segmentu -> traktowane jako względne (np. "podstrona").
  if (!trimmed.includes(":")) return true;

  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!schemeMatch) return false;

  const scheme = schemeMatch[1].toLowerCase();
  return scheme === "http" || scheme === "https" || scheme === "mailto";
}

/**
 * Przeglądarki NIE są zgodne co do tego, co wstawia Enter w zwykłym
 * contenteditable bez własnej obsługi (nie hookujemy tego klawisza — patrz
 * decyzja w RichTextEditor.tsx): Chrome/Safari domyślnie wstawiają <div>,
 * Firefox bywa, że zostawia gołe linie rozdzielone <br>. Efekt jest wizualnie
 * identyczny z akapitem, więc <div> jest tu ALIASEM <p> (zmiana nazwy tagu,
 * nie rozpakowanie) — inaczej złamanie akapitu w Chrome/Safari po prostu
 * znikałoby przy najbliższej sanityzacji.
 */
const BLOCK_ALIASES: Record<string, string> = { div: "p" };

function sanitizeElement(original: Element): void {
  let el = original;
  const originalTag = el.tagName.toLowerCase();

  if (STRIP_WITH_CONTENT.has(originalTag)) {
    el.remove();
    return;
  }

  const aliasTag = BLOCK_ALIASES[originalTag];
  if (aliasTag) {
    const renamed = document.createElement(aliasTag);
    while (el.firstChild) renamed.appendChild(el.firstChild);
    el.replaceWith(renamed);
    el = renamed;
  }

  const tag = el.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) {
    // Nieznany/niedozwolony tag -> rozpakuj (zachowaj treść tekstową i dzieci), nie kasuj bezpowrotnie.
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
    return;
  }

  const allowedAttrs = ALLOWED_ATTRIBUTES[tag] ?? [];
  for (const attr of Array.from(el.attributes)) {
    if (!allowedAttrs.includes(attr.name)) {
      el.removeAttribute(attr.name);
    }
  }

  if (tag === "a") {
    const href = el.getAttribute("href");
    if (href === null || !isSafeUrl(href)) {
      el.removeAttribute("href");
    }
    if (el.getAttribute("target") === "_blank") {
      el.setAttribute("rel", "noopener noreferrer");
    } else {
      el.removeAttribute("target");
      el.removeAttribute("rel");
    }

    // Zagnieżdżony <a> wewnątrz <a> (potrafi powstać z dziwnych wklejek) — spłaszcz do jednego poziomu.
    for (const nestedAnchor of Array.from(el.querySelectorAll("a"))) {
      const parent = nestedAnchor.parentNode;
      if (parent) {
        while (nestedAnchor.firstChild) parent.insertBefore(nestedAnchor.firstChild, nestedAnchor);
        parent.removeChild(nestedAnchor);
      }
    }
  }

  if (tag === "img") {
    const src = el.getAttribute("src");
    if (src === null || !isSafeUrl(src)) {
      el.remove();
      return;
    }
    if (!el.hasAttribute("alt")) {
      el.setAttribute("alt", "");
    }
  }

  // Rekurencja PO ewentualnym spłaszczeniu zagnieżdżonych <a> — lista dzieci mogła się zmienić.
  for (const child of Array.from(el.children)) {
    sanitizeElement(child);
  }
}

/** Czyści HTML z edytora do bezpiecznego, semantycznego podzbioru — patrz ALLOWED_TAGS/ALLOWED_ATTRIBUTES. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  for (const child of Array.from(doc.body.children)) {
    sanitizeElement(child);
  }

  return doc.body.innerHTML;
}
