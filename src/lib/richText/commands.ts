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

/**
 * Blok będący BEZPOŚREDNIM dzieckiem "kontenera bloków" obejmującego bieżące
 * zaznaczenie — zwykle root, ale gdy kursor jest wewnątrz kolumny (patrz
 * insertColumns/[data-column] niżej), kontenerem jest TA kolumna, nie root —
 * inaczej np. zmiana typu bloku wewnątrz kolumny zastąpiłaby całą siatkę
 * kolumn pojedynczym nagłówkiem zamiast działać tylko na jej zawartości.
 */
function getCurrentBlock(root: HTMLElement): HTMLElement | null {
  const range = getCurrentRange(root);
  if (!range) return null;

  let node: Node | null = range.startContainer;
  if (node.nodeType !== Node.ELEMENT_NODE) node = node.parentElement;

  const startEl = node instanceof Element ? node : null;
  const container = (startEl?.closest("[data-column]") as HTMLElement | null) ?? root;

  while (node && node !== container && (node as Element).parentElement !== container) {
    node = (node as Element).parentElement;
  }

  return node && node !== container ? (node as HTMLElement) : null;
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

export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 6;

/**
 * Buduje siatkę kolumn: <div data-columns="N"> z N kolumnami <div data-column>,
 * każda z jednym pustym akapitem — dokładnie ten kształt, który
 * sanitizeHtml.ts rozpoznaje i którego jedynego pilnuje (patrz tam:
 * data-columns/data-column to jedyne dwa atrybuty, jakim ten edytor w ogóle
 * ufa dla <div>, a layout siatki (grid-template-columns) sanitizeHtml.ts
 * ZAWSZE wylicza od nowa z samej liczby kolumn, nigdy z przychodzącego stylu).
 */
function buildColumnsContainer(count: number): HTMLDivElement {
  const container = document.createElement("div");
  container.setAttribute("data-columns", String(count));
  container.style.cssText = `display:grid;grid-template-columns:repeat(${count},1fr);gap:1.5rem`;

  for (let i = 0; i < count; i++) {
    const column = document.createElement("div");
    column.setAttribute("data-column", "");
    const p = document.createElement("p");
    p.appendChild(document.createElement("br"));
    column.appendChild(p);
    container.appendChild(column);
  }

  return container;
}

/**
 * Wstawia siatkę N kolumn przy bieżącym bloku: zastępuje go, gdy jest pusty
 * (typowy przypadek — użytkownik stoi na pustej linii i wybiera "Kolumny"),
 * inaczej dokłada siatkę PO nim, żeby nie skasować istniejącej treści.
 */
export function insertColumns(root: HTMLElement, count: number): void {
  const safeCount = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(count)));
  const container = buildColumnsContainer(safeCount);
  const block = getCurrentBlock(root);

  if (block) {
    const isEmptyBlock = (block.textContent ?? "").trim() === "" && !block.querySelector("img");
    if (isEmptyBlock) {
      block.replaceWith(container);
    } else {
      block.insertAdjacentElement("afterend", container);
    }
  } else {
    root.appendChild(container);
  }

  const firstColumnParagraph = container.querySelector("p");
  if (firstColumnParagraph) placeCaretAtEnd(firstColumnParagraph);
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

/**
 * Wyrównanie obrazka (lewo/środek/prawo) — DOKŁADNIE ten sam mechanizm co
 * setTextAlign/getActiveTextAlign (text-align na akapicie), tylko wyprowadzony
 * z KONKRETNEGO obrazka zamiast z bieżącego zaznaczenia tekstu. Potrzebne
 * osobno, bo kliknięcie obrazka (patrz EditableSurface.tsx) otwiera panel
 * edycji zamiast stawiać kursor w tekście, więc nie ma Selection/Range, z
 * którego getActiveTextAlign/setTextAlign mogłyby odczytać/ustawić akapit.
 *
 * Używane wprost przez TE SAME przyciski wyrównania na pasku co dla tekstu
 * (RichTextEditor.tsx: gdy editingImage !== null, przyciski paska wołają
 * getImageAlign/setImageAlign zamiast getActiveTextAlign/setTextAlign) — tak
 * jak w Wordzie, gdzie zaznaczenie obrazka i kliknięcie tych samych
 * przycisków wyrównania akapitu przesuwa obrazek. Gdy obrazek dzieli akapit
 * z tekstem, wyrównanie dotyczy CAŁEGO tego akapitu (ta sama, świadoma
 * granularność co reszta edytora) — typowy przypadek to obrazek sam w swoim
 * akapicie.
 */
export function getImageAlign(img: HTMLImageElement): TextAlign {
  const value = img.parentElement?.style.textAlign;
  return value === "center" || value === "right" ? value : "left";
}

export function setImageAlign(img: HTMLImageElement, align: TextAlign): void {
  const parent = img.parentElement;
  if (!parent) return;

  if (align === "left") {
    parent.style.removeProperty("text-align");
    if (parent.getAttribute("style") === "") parent.removeAttribute("style");
  } else {
    parent.style.textAlign = align;
  }
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

/** "100px", "50%" — patrz ImagePopover.tsx; null = bez jawnej szerokości (naturalny rozmiar obrazka, ograniczony tylko przez max-w-full w RICH_TEXT_CONTENT_CLASS). */
export type ImageWidth = string | null;

function applyImageWidth(img: HTMLImageElement, width: ImageWidth): void {
  if (width) {
    img.style.width = width;
  } else {
    img.style.removeProperty("width");
    if (img.getAttribute("style") === "") img.removeAttribute("style");
  }
}

/**
 * Wstawia <img alt="…"> w miejscu podanego (wcześniej zapisanego) zaznaczenia
 * — patrz saveSelection. Otwarcie panelu obrazka samo kradnie fokus/zaznaczenie,
 * więc trzeba je przywrócić PRZED wywołaniem tej funkcji.
 *
 * draggable="false" jest CELOWE: NATYWNE przeciąganie obrazka w obrębie
 * contenteditable (bez żadnego własnego kodu obsługującego sam drag) okazało
 * się realnie zawieszać kartę — przeciąganie poza wąski obszar edycji (nad
 * pasek narzędzi) zostawiało przeglądarkę bez poprawnego celu upuszczenia i
 * przeciąganie wisiało w zawieszeniu. Przenoszenie idzie zamiast tego przez
 * WŁASNĄ implementację na zwykłych zdarzeniach myszy (mousedown/mousemove/
 * mouseup w EditableSurface.tsx), nie przez natywne API drag&drop — patrz
 * repositionImage niżej. Różnica jest fundamentalna: przy zwykłych zdarzeniach
 * myszy TO NASZ kod decyduje, kiedy faktycznie zmienić DOM (dopiero na
 * mouseup) — nie ma okna czasowego, w którym przeglądarka "czeka" na
 * potwierdzenie celu upuszczenia i może utknąć.
 */
export function insertImage(range: Range, src: string, alt: string, width: ImageWidth = null): void {
  const img = document.createElement("img");
  img.setAttribute("src", src);
  img.setAttribute("alt", alt);
  img.setAttribute("draggable", "false");
  applyImageWidth(img, width);
  insertNodeAtRange(range, img);
}

/** Zmienia src/alt/szerokość ISTNIEJĄCEGO obrazka — kliknięcie obrazka w edytorze (patrz EditableSurface.tsx::onImageClick) otwiera ten sam popover co wstawianie, ale w trybie edycji tego konkretnego węzła zamiast tworzenia nowego. */
export function updateImageAttributes(img: HTMLImageElement, src: string, alt: string, width: ImageWidth): void {
  img.setAttribute("src", src);
  img.setAttribute("alt", alt);
  img.setAttribute("draggable", "false");
  applyImageWidth(img, width);
}

/**
 * Blok będący BEZPOŚREDNIM dzieckiem "kontenera bloków" obejmującego dany
 * węzeł — ten sam "bezpośrednie dziecko root/kolumny" co getCurrentBlock(),
 * tylko wyprowadzony z KONKRETNEGO węzła (np. obrazka pod kursorem podczas
 * przeciągania, patrz EditableSurface.tsx) zamiast z bieżącego zaznaczenia.
 * Eksportowana też pod wyszukiwanie celu upuszczenia z punktu (x,y) —
 * document.elementFromPoint() zwraca Node, ten sam kod odpowiada na pytanie
 * "który blok akapitu/nagłówka to obejmuje".
 */
export function getBlockContainerOf(root: HTMLElement, node: Node): HTMLElement | null {
  let el: Element | null = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const container = (el?.closest("[data-column]") as HTMLElement | null) ?? root;

  while (el && el !== container && el.parentElement !== container) {
    el = el.parentElement;
  }

  return el && el !== container ? (el as HTMLElement) : null;
}

export type ImageDropTarget = { block: HTMLElement; position: "before" | "after" };

/**
 * Przenosi obrazek DOWOLNIE w dokumencie — wyciąga go z bieżącego miejsca i
 * wstawia jako nowy, samodzielny akapit bezpośrednio przed/po wskazanym
 * bloku docelowym (patrz EditableSurface.tsx — target wyznaczony myszą, nie
 * ograniczony do sąsiadów). Jeśli akapit, z którego obrazek został wyjęty,
 * został przez to całkiem pusty (typowy przypadek — obrazek sam w swoim
 * akapicie), ten pusty akapit jest usuwany, żeby nie zostawiać martwej,
 * pustej linii; jeśli obrazek dzielił akapit z tekstem, reszta tekstu
 * zostaje na miejscu.
 */
export function repositionImage(root: HTMLElement, img: HTMLImageElement, target: ImageDropTarget): void {
  const oldParagraph = img.parentElement;

  const wrapper = document.createElement("p");
  wrapper.appendChild(img); // appendChild PRZENOSI istniejący węzeł — usuwa go z oldParagraph automatycznie.

  if (oldParagraph && oldParagraph.tagName === "P" && oldParagraph.parentElement && isEffectivelyEmptyParagraph(oldParagraph)) {
    oldParagraph.remove();
  }

  const { block, position } = target;
  if (position === "before") {
    block.parentElement?.insertBefore(wrapper, block);
  } else {
    block.parentElement?.insertBefore(wrapper, block.nextSibling);
  }
}

function isEffectivelyEmptyParagraph(el: HTMLElement): boolean {
  return (el.textContent ?? "").trim() === "" && el.querySelector("img") === null;
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

/** Pusty stan: brak dzieci albo jeden pusty <p> (to, co zostaje po wyczyszczeniu treści contenteditable) — ORAZ brak obrazków/kolumn (bez tekstu, ale nie "puste" wizualnie — placeholder nie może się na nie nakładać). */
export function isEditorEmpty(root: HTMLElement): boolean {
  const text = root.textContent?.replace(/​/g, "").trim() ?? "";
  if (text !== "") return false;
  return !root.querySelector("img") && !root.querySelector("[data-columns]");
}
