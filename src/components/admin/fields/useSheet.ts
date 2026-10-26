"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";

export type Cell = { r: number; c: number };
export type CellWrite = { r: number; c: number; value: string };
type Range = { top: number; bottom: number; left: number; right: number };

/**
 * Tabela jak arkusz (Excel / Arkusze Google) — dla tekstowych i liczbowych kolumn TableEditor.tsx:
 *   klik / przeciągnięcie / Shift+klik / Shift+strzałki — zaznaczenie komórek,
 *   strzałki, Tab, Enter — ruch; pisanie, Enter, F2, dwuklik — edycja (Esc anuluje),
 *   Ctrl+C / Ctrl+X / Ctrl+V — kopiuj / wytnij / wklej (także bloki z Excela, jako tekst z tabulatorami;
 *   jedna wartość wklejona na zaznaczenie wypełnia je całe; wklejka dłuższa niż tabela dodaje wiersze),
 *   Delete — czyści, Ctrl+D — wypełnia w dół wartością z pierwszego wiersza, uchwyt ■ w rogu
 *   zaznaczenia — przeciągnięcie w dół powtarza zaznaczone wartości, Ctrl+Z — cofa.
 *
 * Hook trzyma tylko stan zaznaczenia/edycji; dane i zapis należą do tabeli (getValue / write / undo).
 */
export function useSheet({
  rowCount,
  colCount,
  getValue,
  write,
  undo,
}: {
  rowCount: number;
  colCount: number;
  getValue: (r: number, c: number) => string;
  /** Jedna operacja = jedno wywołanie (= jeden krok cofania). Wiersz poza tabelą = nowy wiersz. */
  write: (changes: CellWrite[]) => void;
  undo: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<Cell | null>(null);
  const [editing, setEditing] = useState<{ cell: Cell; draft: string; original: string } | null>(null);
  const [fillTo, setFillTo] = useState<number | null>(null);
  const mode = useRef<"idle" | "select" | "fill">("idle");
  // Edycja zamknięta już raz (Enter) — blur odmontowywanego pola nie zapisuje jej drugi raz.
  const closedEdit = useRef<object | null>(null);

  const clampCell = (cell: Cell): Cell => ({ r: Math.max(0, Math.min(rowCount - 1, cell.r)), c: Math.max(0, Math.min(colCount - 1, cell.c)) });
  const valid = rowCount > 0 && colCount > 0 && anchor !== null && focus !== null;
  const a = valid ? clampCell(anchor!) : null;
  const f = valid ? clampCell(focus!) : null;
  const range: Range | null = a && f ? { top: Math.min(a.r, f.r), bottom: Math.max(a.r, f.r), left: Math.min(a.c, f.c), right: Math.max(a.c, f.c) } : null;

  function focusContainer() {
    containerRef.current?.focus({ preventScroll: true });
  }

  function select(cell: Cell, extend = false) {
    const next = clampCell(cell);
    if (!extend || !anchor) setAnchor(next);
    setFocus(next);
  }

  function move(dr: number, dc: number, extend: boolean) {
    const from = f ?? { r: 0, c: 0 };
    select({ r: from.r + dr, c: from.c + dc }, extend);
    requestAnimationFrame(() => {
      const target = containerRef.current?.querySelector<HTMLElement>(`[data-sheet-cell="${Math.max(0, Math.min(rowCount - 1, from.r + dr))}:${Math.max(0, Math.min(colCount - 1, from.c + dc))}"]`);
      target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
  }

  function startEdit(cell: Cell, draft?: string) {
    const original = getValue(cell.r, cell.c);
    select(cell);
    setEditing({ cell, draft: draft ?? original, original });
  }

  function commitEdit(then?: { dr: number; dc: number }) {
    if (!editing || closedEdit.current === editing) return;
    closedEdit.current = editing;
    const { cell, draft, original } = editing;
    setEditing(null);
    if (draft !== original) write([{ r: cell.r, c: cell.c, value: draft }]);
    if (then) {
      setAnchor(null);
      select({ r: cell.r + then.dr, c: cell.c + then.dc });
    }
    focusContainer();
  }

  function cancelEdit() {
    setEditing(null);
    focusContainer();
  }

  function rangeCells(target: Range): Cell[] {
    const cells: Cell[] = [];
    for (let r = target.top; r <= target.bottom; r++) for (let c = target.left; c <= target.right; c++) cells.push({ r, c });
    return cells;
  }

  function clearRange() {
    if (!range) return;
    write(rangeCells(range).filter((cell) => getValue(cell.r, cell.c) !== "").map((cell) => ({ ...cell, value: "" })));
  }

  function copyText(): string {
    if (!range) return "";
    const lines: string[] = [];
    for (let r = range.top; r <= range.bottom; r++) {
      const cells: string[] = [];
      for (let c = range.left; c <= range.right; c++) cells.push(getValue(r, c).replace(/[\t\r\n]+/g, " "));
      lines.push(cells.join("\t"));
    }
    return lines.join("\n");
  }

  function paste(text: string) {
    if (!range) return;
    const lines = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
    const grid = lines.map((line) => line.split("\t"));
    const changes: CellWrite[] = [];
    if (grid.length === 1 && grid[0].length === 1) {
      // Jedna wartość -> całe zaznaczenie.
      for (const cell of rangeCells(range)) changes.push({ ...cell, value: grid[0][0] });
    } else {
      grid.forEach((cells, dr) =>
        cells.forEach((value, dc) => {
          const c = range.left + dc;
          if (c < colCount) changes.push({ r: range.top + dr, c, value });
        })
      );
      setAnchor({ r: range.top, c: range.left });
      setFocus({ r: range.top + grid.length - 1, c: Math.min(colCount - 1, range.left + Math.max(...grid.map((cells) => cells.length)) - 1) });
    }
    write(changes);
  }

  /** Wartości zaznaczonych wierszy powtarzane w dół aż do wiersza `to` (uchwyt wypełniania, Ctrl+D). */
  function fillDown(to: number, source: Range) {
    const height = source.bottom - source.top + 1;
    const changes: CellWrite[] = [];
    for (let r = source.bottom + 1; r <= to; r++) {
      for (let c = source.left; c <= source.right; c++) changes.push({ r, c, value: getValue(source.top + ((r - source.bottom - 1) % height), c) });
    }
    if (changes.length > 0) write(changes);
  }

  // Koniec przeciągania (zaznaczanie / uchwyt wypełniania) — także poza tabelą.
  const fillRef = useRef({ fillTo, range, fillDown });
  useEffect(() => {
    fillRef.current = { fillTo, range, fillDown };
  });
  useEffect(() => {
    const onUp = () => {
      const { fillTo: target, range: current, fillDown: fill } = fillRef.current;
      if (mode.current === "fill" && current && target !== null && target > current.bottom) {
        fill(target, current);
        setFocus((prev) => (prev ? { r: target, c: current.right } : prev));
        setAnchor({ r: current.top, c: current.left });
      }
      mode.current = "idle";
      setFillTo(null);
    };
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
  }, []);

  // Schowek: zdarzenia copy/cut/paste trafiają do dokumentu — obsługujemy je, gdy fokus jest w arkuszu (i nie trwa edycja komórki).
  const clipRef = useRef({ copyText, paste, clearRange, editing, range });
  useEffect(() => {
    clipRef.current = { copyText, paste, clearRange, editing, range };
  });
  useEffect(() => {
    const active = () => {
      const { editing: isEditing, range: current } = clipRef.current;
      return !isEditing && current !== null && containerRef.current !== null && document.activeElement === containerRef.current;
    };
    const onCopy = (event: ClipboardEvent) => {
      if (!active()) return;
      event.preventDefault();
      event.clipboardData?.setData("text/plain", clipRef.current.copyText());
    };
    const onCut = (event: ClipboardEvent) => {
      if (!active()) return;
      event.preventDefault();
      event.clipboardData?.setData("text/plain", clipRef.current.copyText());
      clipRef.current.clearRange();
    };
    const onPaste = (event: ClipboardEvent) => {
      if (!active()) return;
      event.preventDefault();
      clipRef.current.paste(event.clipboardData?.getData("text/plain") ?? "");
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  function onKeyDown(event: ReactKeyboardEvent) {
    // Tylko gdy fokus jest na samym arkuszu — nie w polach w środku tabeli (np. adres zdjęcia).
    if (event.target !== event.currentTarget || editing || !range || !f) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const key = event.key;

    const arrows: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[key]) {
      event.preventDefault();
      const [dr, dc] = arrows[key];
      if (ctrl) move(dr * rowCount, dc * colCount, event.shiftKey);
      else move(dr, dc, event.shiftKey);
      return;
    }
    if (key === "Tab") {
      event.preventDefault();
      setAnchor(null);
      move(0, event.shiftKey ? -1 : 1, false);
      return;
    }
    if (key === "Enter" || key === "F2") {
      event.preventDefault();
      startEdit(f);
      return;
    }
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault();
      clearRange();
      return;
    }
    if (key === "Escape") {
      setAnchor(null);
      setFocus(null);
      return;
    }
    if (ctrl && key.toLowerCase() === "a") {
      event.preventDefault();
      setAnchor({ r: 0, c: 0 });
      setFocus({ r: rowCount - 1, c: colCount - 1 });
      return;
    }
    if (ctrl && key.toLowerCase() === "d") {
      event.preventDefault();
      if (range.bottom > range.top) fillDown(range.bottom, { ...range, bottom: range.top });
      return;
    }
    if (ctrl && key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
      return;
    }
    // Zwykły znak — zaczyna edycję, zastępując wartość (jak w arkuszu).
    if (!ctrl && !event.altKey && key.length === 1) {
      event.preventDefault();
      startEdit(f, key);
    }
  }

  function cell(r: number, c: number) {
    const inRange = range !== null && r >= range.top && r <= range.bottom && c >= range.left && c <= range.right;
    const inFill = range !== null && fillTo !== null && r > range.bottom && r <= fillTo && c >= range.left && c <= range.right;
    return {
      inRange,
      inFill,
      isFocus: f !== null && f.r === r && f.c === c,
      isEditing: editing !== null && editing.cell.r === r && editing.cell.c === c,
      /** Uchwyt wypełniania — w prawym dolnym rogu zaznaczenia. */
      hasHandle: range !== null && editing === null && r === range.bottom && c === range.right,
      props: {
        "data-sheet-cell": `${r}:${c}`,
        onMouseDown: (event: ReactMouseEvent) => {
          if (event.button !== 0 || (editing && editing.cell.r === r && editing.cell.c === c)) return;
          event.preventDefault();
          if (editing) commitEdit();
          select({ r, c }, event.shiftKey);
          mode.current = "select";
          focusContainer();
        },
        onMouseEnter: () => {
          if (mode.current === "select") setFocus({ r, c });
          if (mode.current === "fill") setFillTo(r);
        },
        onDoubleClick: () => startEdit({ r, c }),
      },
    };
  }

  const handleProps = {
    onMouseDown: (event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      mode.current = "fill";
    },
    title: "Przeciągnij w dół, aby skopiować wartości",
  };

  const editorProps = editing
    ? {
        autoFocus: true,
        value: editing.draft,
        onChange: (event: { target: { value: string } }) => setEditing((prev) => (prev ? { ...prev, draft: event.target.value } : prev)),
        onBlur: () => commitEdit(),
        onKeyDown: (event: ReactKeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitEdit({ dr: event.shiftKey ? -1 : 1, dc: 0 });
          } else if (event.key === "Tab") {
            event.preventDefault();
            commitEdit({ dr: 0, dc: event.shiftKey ? -1 : 1 });
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancelEdit();
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            commitEdit({ dr: event.key === "ArrowUp" ? -1 : 1, dc: 0 });
          }
        },
      }
    : null;

  return {
    containerProps: { ref: containerRef, tabIndex: 0, onKeyDown },
    cell,
    handleProps,
    editorProps,
    hasSelection: range !== null,
  };
}
