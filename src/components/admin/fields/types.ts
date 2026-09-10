import type { Session } from "@/lib/adminApi";
import type { FieldType } from "@/lib/fieldType";

export type Path = (string | number)[];
export type OnChange = (path: Path, value: unknown) => void;

export const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Wspólny kontrakt KAŻDEGO edytora w rejestrze (registry.ts) — panel wybiera
 * komponent WYŁĄCZNIE po field.type, więc wszystkie pięć edytorów (i każdy
 * przyszły) musi umieć się zmieścić w tym samym kształcie propsów.
 * "meta" to wąska furtka na wskazówki specyficzne dla JEDNEGO typu (dziś: tylko
 * TableEditor czyta meta.columnLabels) — nie wpływa na to, KTÓRY edytor się
 * wybiera (to wciąż wyłącznie field.type), tylko jak ten jeden edytor się
 * prezentuje.
 */
export type FieldEditorProps<T = unknown> = {
  label: string;
  name: string;
  value: T;
  path: Path;
  session: Session | null;
  onChange: OnChange;
  meta?: {
    /** Dla type:"table" pola o kluczu "rows" — nagłówki kolumn z sąsiedniego pola "columns" (patrz PriceHistory). */
    columnLabels?: Record<string, string>;
  };
};

export type { FieldType };
