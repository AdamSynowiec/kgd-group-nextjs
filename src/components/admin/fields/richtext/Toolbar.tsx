"use client";

import type { BlockType, InlineMark, TextAlign } from "@/lib/richText/commands";

export type ViewMode = "edit" | "html";

const BLOCK_OPTIONS: { value: BlockType; label: string }[] = [
  { value: "p", label: "Akapit" },
  { value: "h1", label: "Nagłówek 1" },
  { value: "h2", label: "Nagłówek 2" },
  { value: "h3", label: "Nagłówek 3" },
  { value: "h4", label: "Nagłówek 4" },
  { value: "h5", label: "Nagłówek 5" },
  { value: "h6", label: "Nagłówek 6" },
];

const ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: "left", label: "Do lewej" },
  { value: "center", label: "Do środka" },
  { value: "right", label: "Do prawej" },
];

const buttonClass = (active: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;

/**
 * Wyłącznie prezentacja — cała logika (co jest aktywne, co robi kliknięcie)
 * żyje w RichTextEditor.tsx. `onMouseDown` z preventDefault na KAŻDYM
 * PRZYCISKU formatowania: standardowa technika, żeby kliknięcie nie
 * przenosiło fokusu z edytora i nie kasowało zaznaczenia, zanim komenda
 * zdąży je odczytać (patrz "zachowanie zaznaczenia" w opisie zadania).
 *
 * <select> typu bloku NIE dostaje tego samego preventDefault — dla <select>
 * (w odróżnieniu od <button>) to WŁAŚNIE domyślna akcja mousedown otwiera
 * natywną listę (przynajmniej w przeglądarkach opartych na Chromium);
 * zablokowanie jej sprawiało, że rozwijana lista w ogóle się nie otwierała.
 * Zamiast tego RichTextEditor.tsx zapisuje zaznaczenie w onMouseDown (fokus
 * jeszcze nie przeszedł na <select>) i przywraca je w onChange.
 */
export default function Toolbar({
  blockType,
  onSetBlockType,
  onBlockSelectMouseDown,
  blockTypeDisabled,
  marks,
  onToggleMark,
  markDisabled,
  isBulletList,
  isOrderedList,
  onToggleList,
  align,
  onSetAlign,
  isLinkActive,
  linkDisabled,
  onOpenLink,
  onOpenImage,
  onOpenColumns,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  view,
  onSetView,
}: {
  blockType: BlockType | null;
  onSetBlockType: (type: BlockType) => void;
  /** Zapisuje bieżące zaznaczenie PRZED oddaniem fokusu <select>-owi — patrz komentarz przy elemencie select niżej. */
  onBlockSelectMouseDown: () => void;
  blockTypeDisabled: boolean;
  marks: Record<InlineMark, boolean>;
  onToggleMark: (mark: InlineMark) => void;
  markDisabled: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  onToggleList: (tag: "ul" | "ol") => void;
  align: TextAlign;
  onSetAlign: (align: TextAlign) => void;
  isLinkActive: boolean;
  linkDisabled: boolean;
  onOpenLink: () => void;
  onOpenImage: () => void;
  onOpenColumns: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  view: ViewMode;
  onSetView: (view: ViewMode) => void;
}) {
  const preventFocusLoss = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5">
      <select
        value={blockType ?? "p"}
        disabled={blockTypeDisabled || view === "html"}
        onMouseDown={onBlockSelectMouseDown}
        onChange={(event) => onSetBlockType(event.target.value as BlockType)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-40"
        aria-label="Typ bloku (akapit lub nagłówek)"
      >
        {BLOCK_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <Separator />

      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => onToggleMark("strong")}
        disabled={markDisabled || view === "html"}
        aria-pressed={marks.strong}
        aria-label="Pogrubienie"
        title={markDisabled ? "Zaznacz tekst, aby zastosować formatowanie" : "Pogrubienie"}
        className={buttonClass(marks.strong)}
      >
        <span className="font-bold">B</span>
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => onToggleMark("em")}
        disabled={markDisabled || view === "html"}
        aria-pressed={marks.em}
        aria-label="Kursywa"
        title={markDisabled ? "Zaznacz tekst, aby zastosować formatowanie" : "Kursywa"}
        className={buttonClass(marks.em)}
      >
        <span className="italic">I</span>
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => onToggleMark("u")}
        disabled={markDisabled || view === "html"}
        aria-pressed={marks.u}
        aria-label="Podkreślenie"
        title={markDisabled ? "Zaznacz tekst, aby zastosować formatowanie" : "Podkreślenie"}
        className={buttonClass(marks.u)}
      >
        <span className="underline">U</span>
      </button>

      <Separator />

      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => onToggleList("ul")}
        disabled={view === "html"}
        aria-pressed={isBulletList}
        aria-label="Lista punktowana"
        title="Lista punktowana"
        className={buttonClass(isBulletList)}
      >
        • Lista
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={() => onToggleList("ol")}
        disabled={view === "html"}
        aria-pressed={isOrderedList}
        aria-label="Lista numerowana"
        title="Lista numerowana"
        className={buttonClass(isOrderedList)}
      >
        1. Lista
      </button>

      <Separator />

      {ALIGN_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onMouseDown={preventFocusLoss}
          onClick={() => onSetAlign(option.value)}
          disabled={view === "html"}
          aria-pressed={align === option.value}
          aria-label={option.label}
          title={option.label}
          className={buttonClass(align === option.value)}
        >
          <AlignIcon align={option.value} className="h-4 w-4" />
        </button>
      ))}

      <Separator />

      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={onOpenLink}
        disabled={(linkDisabled && !isLinkActive) || view === "html"}
        aria-pressed={isLinkActive}
        aria-label={isLinkActive ? "Edytuj lub usuń link" : "Dodaj link"}
        title={
          linkDisabled && !isLinkActive
            ? "Zaznacz tekst, aby dodać link"
            : isLinkActive
              ? "Edytuj lub usuń link"
              : "Dodaj link"
        }
        className={buttonClass(isLinkActive)}
      >
        🔗 Link
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={onOpenImage}
        disabled={view === "html"}
        aria-label="Wstaw zdjęcie"
        title="Wstaw zdjęcie"
        className={buttonClass(false)}
      >
        🖼 Zdjęcie
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={onOpenColumns}
        disabled={view === "html"}
        aria-label="Wstaw kolumny"
        title="Wstaw kolumny"
        className={buttonClass(false)}
      >
        ▥ Kolumny
      </button>

      <Separator />

      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={onUndo}
        disabled={!canUndo || view === "html"}
        aria-label="Cofnij"
        title="Cofnij (Ctrl+Z)"
        className={buttonClass(false)}
      >
        ↶ Cofnij
      </button>
      <button
        type="button"
        onMouseDown={preventFocusLoss}
        onClick={onRedo}
        disabled={!canRedo || view === "html"}
        aria-label="Ponów"
        title="Ponów (Ctrl+Y)"
        className={buttonClass(false)}
      >
        ↷ Ponów
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSetView("edit")}
          aria-pressed={view === "edit"}
          className={buttonClass(view === "edit")}
        >
          Edycja
        </button>
        <button
          type="button"
          onClick={() => onSetView("html")}
          aria-pressed={view === "html"}
          className={buttonClass(view === "html")}
        >
          Podgląd HTML
        </button>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-zinc-200" aria-hidden />;
}

/** Trzy poziome kreski w układzie danego wyrównania — prosty SVG bez zależności, jak reszta ikon w panelu (patrz src/components/admin/icons.tsx). */
function AlignIcon({ align, className }: { align: TextAlign; className?: string }) {
  const lines: Record<TextAlign, { x1: number; x2: number }[]> = {
    left: [
      { x1: 3, x2: 21 },
      { x1: 3, x2: 15 },
      { x1: 3, x2: 18 },
    ],
    center: [
      { x1: 3, x2: 21 },
      { x1: 6, x2: 18 },
      { x1: 4.5, x2: 19.5 },
    ],
    right: [
      { x1: 3, x2: 21 },
      { x1: 9, x2: 21 },
      { x1: 6, x2: 21 },
    ],
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden>
      {lines[align].map((line, i) => (
        <line key={i} x1={line.x1} y1={6 + i * 6} x2={line.x2} y2={6 + i * 6} />
      ))}
    </svg>
  );
}
