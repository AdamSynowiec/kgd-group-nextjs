"use client";

/**
 * Komendy edytora artykułów operujące bezpośrednio na Selection/Range API
 * (bez document.execCommand — deprecated, niespójne między przeglądarkami).
 * Zwykłe pisanie/Enter/Backspace/strzałki NIE przechodzą przez ten plik —
 * to natywne, wbudowane zachowanie contenteditable w każdej przeglądarce.
 * Tu są wyłącznie akcje wywoływane z paska narzędzi (RichTextEditor.tsx).
 *
 * Każda komenda zakłada, że działa NA ZAZNACZENIU WEWNĄTRZ danego `root`
 * (kontenera contenteditable) — wywołujący odpowiada za to, że fokus/zaznaczenie
 * są tam, zanim komenda zostanie wykonana (patrz saveSelection/restoreSelection
 * niżej, używane przy popoverach, które same przejmują fokus).
 */

export type InlineMark = "strong" | "em" | "u";
export type BlockType = "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type TextAlign = "left" | "center" | "right";

function getSelectionWithin(root: HTMLElement): Selection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  return selection;
}

export function getCurrentRange(root: HTMLElement): Range | null {
  const selection = getSelectionWithin(root);
  return selection ? selection.getRangeAt(0) : null;
}

/** Kopia Range do przywrócenia później — potrzebne, bo otwarcie popovera (input URL/alt) kradnie fokus/zaznaczenie z edytora. */
export function saveSelection(root: HTMLElement): Range | null {
  const range = getCurrentRange(root);
  return range ? range.cloneRange() : null;
}

export function restoreSelection(range: Range | null): void {
  if (!range) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

function closestElement(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

/** Najbliższy element danego tagu obejmujący WCAŁOŚCI bieżące zaznaczenie (nie tylko jego początek). */
export function findAncestorTag(root: HTMLElement, tagName: string): HTMLElement | null {
  const range = getCurrentRange(root);
  if (!range) return null;

  const startEl = closestElement(range.startContainer);
  const endEl = closestElement(range.endContainer);
  if (!startEl || !endEl) return null;

  const startMatch = startEl.closest(tagName);
  const endMatch = endEl.closest(tagName);

  if (startMatch && startMatch === endMatch && root.contains(startMatch)) {
    return startMatch as HTMLElement;
  }
  return null;
}

export function isMarkActive(root: HTMLElement, mark: InlineMark): boolean {
  return findAncestorTag(root, mark) !== null;
}

/** Blok będący BEZPOŚREDNIM dzieckiem root, w którym leży bieżące zaznaczenie — patrz założenie w setBlockType(). */
function getCurrentBlock(root: HTMLElement): HTMLElement | null {
  const range = getCurrentRange(root);
  if (!range) return null;

  let node: Node | null = range.startContainer;
  if (node.nodeType !== Node.ELEMENT_NODE) node = node.parentElement;

  while (node && node !== root && (node as Element).parentElement !== root) {
    node = (node as Element).parentElement;
  }

  return node && node !== root ? (node as HTMLElement) : null;
}

export function getActiveBlockType(root: HTMLElement): BlockType | null {
  const block = getCurrentBlock(root);
  if (!block) return null;
  const tag = block.tagName.toLowerCase();
  return (["p", "h1", "h2", "h3", "h4", "h5", "h6"] as const).includes(tag as BlockType) ? (tag as BlockType) : null;
}

export function isInsideList(root: HTMLElement): boolean {
  return getActiveListTag(root) !== null;
}

/** Typ listy (ul/ol) obejmującej bieżące zaznaczenie, albo null poza listą — pod podświetlenie przycisków paska narzędzi. */
export function getActiveListTag(root: HTMLElement): "ul" | "ol" | null {
  const range = getCurrentRange(root);
  if (!range) return null;
  const li = closestElement(range.startContainer)?.closest("li") ?? null;
  const list = li?.parentElement;
  if (!list) return null;
  if (list.tagName === "UL") return "ul";
  if (list.tagName === "OL") return "ol";
  return null;
}

/**
 * Zamienia blok (akapit/nagłówek będący bezpośrednim dzieckiem root) na inny
 * tag, zachowując zawartość. Celowo NIE działa wewnątrz list (li) — patrz
 * "Świadomie poza zakresem" w planie; przełączanie typu bloku wewnątrz listy
 * to rzadki przypadek, pomijalny bez utraty typowego workflow pisania.
 */
export function setBlockType(root: HTMLElement, tag: BlockType): void {
  const block = getCurrentBlock(root);
  if (!block || block.closest("li")) return;

  const replacement = document.createElement(tag);
  while (block.firstChild) replacement.appendChild(block.firstChild);
  block.replaceWith(replacement);

  placeCaretAtEnd(replacement);
}

/** Zawija bieżące (niepuste) zaznaczenie w nowy element danego tagu — np. <strong>. */
export function wrapSelection(root: HTMLElement, tag: InlineMark): void {
  const selection = getSelectionWithin(root);
  if (!selection || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const wrapper = document.createElement(tag);
  wrapper.appendChild(range.extractContents());
  range.insertNode(wrapper);

  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

/** Rozpakowuje element danego tagu obejmujący zaznaczenie (odwrotność wrapSelection). */
export function unwrapTag(root: HTMLElement, element: HTMLElement): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
  void root;
}

/** Toggle pogrubienia/podkreślenia/kursywy — wymaga niepustego zaznaczenia (patrz Toolbar.tsx: przyciski wyłączone bez zaznaczenia). */
export function toggleInlineMark(root: HTMLElement, mark: InlineMark): void {
  const existing = findAncestorTag(root, mark);
  if (existing) {
    unwrapTag(root, existing);
  } else {
    wrapSelection(root, mark);
  }
}

/**
 * Przełącza listę (ul/ol) dla BIEŻĄCEGO bloku (jeden blok naraz — patrz
 * "Świadomie poza zakresem" w planie). Ponowne kliknięcie tego samego typu
 * listy wypisuje z powrotem do akapitu; kliknięcie innego typu (ul<->ol)
 * zamienia sam wrapper.
 */
export function toggleList(root: HTMLElement, listTag: "ul" | "ol"): void {
  const range = getCurrentRange(root);
  if (!range) return;

  const currentLi = closestElement(range.startContainer)?.closest("li") ?? null;

  if (currentLi) {
    const list = currentLi.parentElement;
    if (!list || !(list.tagName === "UL" || list.tagName === "OL")) return;

    if (list.tagName.toLowerCase() === listTag) {
      // Ten sam typ listy -> wypisz z powrotem do akapitów, każdy <li> osobno.
      const items = Array.from(list.children);
      const fragment = document.createDocumentFragment();
      for (const li of items) {
        const p = document.createElement("p");
        while (li.firstChild) p.appendChild(li.firstChild);
        fragment.appendChild(p);
      }
      const lastP = fragment.lastElementChild as HTMLElement | null;
      list.replaceWith(fragment);
      if (lastP) placeCaretAtEnd(lastP);
      return;
    }

    // Inny typ listy -> zamień sam wrapper, zawartość <li> zostaje bez zmian.
    const replacement = document.createElement(listTag);
    while (list.firstChild) replacement.appendChild(list.firstChild);
    list.replaceWith(replacement);
    placeCaretAtEnd(currentLi);
    return;
  }

  const block = getCurrentBlock(root);
  if (!block) return;

  const list = document.createElement(listTag);
  const li = document.createElement("li");
  while (block.firstChild) li.appendChild(block.firstChild);
  list.appendChild(li);
  block.replaceWith(list);
  placeCaretAtEnd(li);
}

/**
 * Blok, na który działa wyrównanie tekstu: <li>, gdy zaznaczenie jest wewnątrz
 * listy (wyrównanie działa na pojedynczym elemencie listy, nie na całej liście
 * naraz), inaczej zwykły blok bezpośrednio pod root — jak w setBlockType().
 */
function getAlignmentTarget(root: HTMLElement): HTMLElement | null {
  const range = getCurrentRange(root);
  if (!range) return null;

  const li = closestElement(range.startContainer)?.closest("li") ?? null;
  if (li && root.contains(li)) return li as HTMLElement;

  return getCurrentBlock(root);
}

/** Wyrównanie tekstu bieżącego bloku — inline style (nie klasa), bo to jedyny sposób, żeby ta sama wartość przetrwała zarówno w podglądzie edytora, jak i w opublikowanym HTML-u (patrz sanitizeHtml.ts, gdzie "style" jest dopuszczone WYŁĄCZNIE dla text-align). "left" usuwa atrybut zamiast go zapisywać — to domyślne wyrównanie przeglądarki, nie trzeba go trzymać jawnie. */
export function setTextAlign(root: HTMLElement, align: TextAlign): void {
  const target = getAlignmentTarget(root);
  if (!target) return;

  if (align === "left") {
    target.style.removeProperty("text-align");
    if (target.getAttribute("style") === "") target.removeAttribute("style");
  } else {
    target.style.textAlign = align;
  }
}

/** Wyrównanie bieżącego bloku pod podświetlenie przycisków paska — "left", gdy nic nie jest jawnie ustawione (domyślne). */
export function getActiveTextAlign(root: HTMLElement): TextAlign {
  const target = getAlignmentTarget(root);
  const value = target?.style.textAlign;
  return value === "center" || value === "right" ? value : "left";
}

/** Zawija NIEPUSTE zaznaczenie w nowy <a>. Wymaga wywołującego, by wcześniej sprawdził, że zaznaczenie nie jest zwinięte (patrz Toolbar: przycisk linku wyłączony, gdy nic nie zaznaczono i kursor nie jest w istniejącym linku). */
export function applyLink(root: HTMLElement, url: string, openInNewTab: boolean): void {
  const selection = getSelectionWithin(root);
  if (!selection || selection.isCollapsed) return;

  const range = selection.getRangeAt(0);
  const anchor = document.createElement("a");
  anchor.setAttribute("href", url);
  setLinkTargetAttributes(anchor, openInNewTab);
  anchor.appendChild(range.extractContents());
  range.insertNode(anchor);

  const newRange = document.createRange();
  newRange.selectNodeContents(anchor);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

export function updateLinkAttributes(anchor: HTMLAnchorElement, url: string, openInNewTab: boolean): void {
  anchor.setAttribute("href", url);
  setLinkTargetAttributes(anchor, openInNewTab);
}

function setLinkTargetAttributes(anchor: HTMLAnchorElement, openInNewTab: boolean): void {
  if (openInNewTab) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  } else {
    anchor.removeAttribute("target");
    anchor.removeAttribute("rel");
  }
}

export function removeLink(root: HTMLElement, anchor: HTMLAnchorElement): void {
  unwrapTag(root, anchor);
}

/** Wstawia <img alt="…"> w miejscu podanego (wcześniej zapisanego) zaznaczenia — patrz saveSelection. Otwarcie panelu obrazka samo kradnie fokus/zaznaczenie, więc trzeba je przywrócić PRZED wywołaniem tej funkcji. */
export function insertImage(range: Range, src: string, alt: string): void {
  const img = document.createElement("img");
  img.setAttribute("src", src);
  img.setAttribute("alt", alt);
  insertNodeAtRange(range, img);
}

/** Wstawia węzeł (np. <img>) w miejscu zapisanego wcześniej zaznaczenia — patrz saveSelection/restoreSelection. */
export function insertNodeAtRange(range: Range, node: Node): void {
  range.deleteContents();
  range.insertNode(node);
  range.collapse(false);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function placeCaretAtEnd(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/** Pusty stan: brak dzieci albo jeden pusty <p> (to, co zostaje po wyczyszczeniu treści contenteditable). */
export function isEditorEmpty(root: HTMLElement): boolean {
  const text = root.textContent?.replace(/​/g, "").trim() ?? "";
  if (text !== "") return false;
  return !root.querySelector("img");
}
