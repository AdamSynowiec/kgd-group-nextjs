"use client";

import { useState, type KeyboardEvent } from "react";
import { MAX_COLUMNS, MIN_COLUMNS } from "@/lib/richText/commands";

const buttonClass = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50";

/** Panel wstawiania siatki kolumn — jeden pasek WEWNĄTRZ edytora, ten sam wzorzec co LinkPopover.tsx/ImagePopover.tsx. */
export default function ColumnsPopover({
  onConfirm,
  onCancel,
}: {
  onConfirm: (count: number) => void;
  onCancel: () => void;
}) {
  const [count, setCount] = useState(2);

  function handleConfirm() {
    onConfirm(count);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-zinc-200 bg-blue-50 px-3 py-2">
      <div>
        <label htmlFor="richtext-columns-count" className="mb-1 block text-xs font-medium text-zinc-600">
          Liczba kolumn
        </label>
        <input
          id="richtext-columns-count"
          type="number"
          min={MIN_COLUMNS}
          max={MAX_COLUMNS}
          step={1}
          value={count}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) setCount(Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(next))));
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: MAX_COLUMNS - MIN_COLUMNS + 1 }, (_, i) => MIN_COLUMNS + i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            aria-pressed={count === n}
            className={n === count ? `${buttonClass} border-zinc-900 bg-zinc-900 text-white` : buttonClass}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" onClick={handleConfirm} className={`${buttonClass} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`}>
          Wstaw kolumny
        </button>
        <button type="button" onClick={onCancel} className={buttonClass}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
