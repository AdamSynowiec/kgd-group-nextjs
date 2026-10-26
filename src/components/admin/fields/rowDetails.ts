/**
 * Okno "Więcej" w wierszu tabeli (TableEditor.tsx -> RowDetailsDialog.tsx) — opisane DANYMI, nie kodem.
 * Pole tabeli w bazie dostaje "details": nazwę presetu albo własny opis:
 *
 *   "details": "unitCard"                                  — gotowy preset (niżej)
 *   "details": { "preset": "unitCard", "files": { ... } }  — preset z podmienioną częścią
 *   "details": { "summary": {...}, "tabs": {...}, "files": {...} } — od zera
 *
 * Części okna (każda opcjonalna):
 *   summary — formularz pól wiersza (tekst, liczba, długi tekst, zdjęcie),
 *   tabs    — lista przycisków-zakładek {label, image, text, rooms: [{name, area}]} pod kluczem tabs.key,
 *   files   — pliki PDF,
 *   plan    — obrys wiersza na zdjęciu planu (PlanEditor.tsx; nad tabelą także "Obrysy na planie" dla wszystkich).
 * Klucz pola może być zagnieżdżony: "card.prospectusUrl" = row.card.prospectusUrl.
 *
 * Pola, które żyją tylko w oknie (zakładki, pliki, zdjęcia, długie teksty, klucze zagnieżdżone), znikają
 * z tabeli, a komórka "Więcej" kopiuje się w arkuszu razem z nimi wszystkimi (detailOwnedKeys).
 */

import { visibleTabs, type UnitCardData } from "@/lib/investments/unitCards";

export type DetailFieldType = "text" | "number" | "textarea" | "image" | "file";

export type DetailField = {
  key: string;
  label: string;
  type?: DetailFieldType;
  placeholder?: string;
  /** Podpowiadaj wartości wpisane już w innych wierszach (np. strefy, statusy). */
  suggest?: boolean;
  /** type "file": pusty plik = plik z pola strony obok (np. wspólny prospekt inwestycji) — podpowiedź w panelu. */
  fallbackSibling?: string;
  /** type "file": opis stanu, gdy pliku nie ma (i nie ma fallbackSibling). */
  emptyText?: string;
};

export type RowDetailsConfig = {
  /** Nagłówek kolumny w tabeli. */
  column?: string;
  /** Napis na przycisku w komórce. */
  button?: string;
  /** Klucz wiersza w tytule okna (np. "unit") i klucze w podtytule. */
  title?: string;
  subtitle?: string[];
  summary?: { label?: string; labelSibling?: string; text?: string; fields: DetailField[] };
  tabs?: { key: string; label?: string; legacySibling?: string };
  files?: { label?: string; text?: string; fields: DetailField[] };
  /** Obrys na planie: klucz wiersza z wielokątem i pola strony ze zdjęciem planu oraz jego wymiarami. */
  plan?: { key: string; label?: string; imageSibling: string; widthSibling?: string; heightSibling?: string; labelKey?: string; statusKey?: string };
};

export const ROW_DETAIL_PRESETS: Record<string, RowDetailsConfig> = {
  /** Karta lokalu inwestycji (Fox Hills i kolejne): podsumowanie, przyciski "Parter" / "Piętro" / ..., pliki. */
  unitCard: {
    column: "Karta lokalu",
    button: "Więcej",
    title: "unit",
    subtitle: ["type", "floor", "area", "status"],
    summary: {
      label: "Podsumowanie",
      labelSibling: "summaryLabel",
      text: "Pierwszy przycisk karty na stronie. To te same dane co w tabeli lokali — zmiana tutaj od razu zmienia wiersz w tabeli.",
      fields: [
        { key: "image", label: "Zdjęcie lokalu", type: "image" },
        { key: "zone", label: "Strefa", suggest: true },
        { key: "floor", label: "Piętro", suggest: true },
        { key: "rooms", label: "Pokoje", type: "number" },
        { key: "area", label: "PUM (m²)", type: "number" },
        { key: "garden", label: "Ogród (m²)", type: "number", placeholder: "puste = bez ogrodu" },
        { key: "plot", label: "Działka (m²)", type: "number" },
        { key: "status", label: "Status", suggest: true, placeholder: "Dostępny / Rezerwacja / Sprzedany" },
        { key: "pricePerM2", label: "Cena za m² (zł)", type: "number" },
        { key: "price", label: "Cena łączna", placeholder: "puste = PUM × cena za m²" },
        { key: "layout", label: "Układ (krótki opis)", type: "textarea" },
      ],
    },
    tabs: { key: "card.tabs", label: "Przyciski w karcie", legacySibling: "unitViews" },
    files: {
      label: "Pliki lokalu",
      text: "Jeden plik każdego rodzaju na cały lokal — przyciski pod kartą na stronie.",
      fields: [
        { key: "link", label: "Karta lokalu", type: "file", emptyText: "Brak pliku — przycisku „Karta lokalu” nie ma na stronie" },
        { key: "card.prospectusUrl", label: "Prospekt informacyjny", type: "file", fallbackSibling: "prospectusUrl", emptyText: "Brak pliku — przycisk prowadzi do formularza kontaktowego" },
        { key: "card.standardUrl", label: "Standard wykończenia", type: "file", fallbackSibling: "standardUrl", emptyText: "Brak pliku — przycisk prowadzi do formularza kontaktowego" },
      ],
    },
    plan: { key: "polygon", label: "Obrysy na planie", imageSibling: "planImage", widthSibling: "planWidth", heightSibling: "planHeight", labelKey: "unit", statusKey: "status" },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

/** "details" z bazy -> konfiguracja okna (null = tabela bez "Więcej"). */
export function resolveRowDetails(raw: unknown): RowDetailsConfig | null {
  if (typeof raw === "string") return ROW_DETAIL_PRESETS[raw] ?? null;
  if (!isRecord(raw)) return null;
  const base = typeof raw.preset === "string" ? (ROW_DETAIL_PRESETS[raw.preset] ?? {}) : {};
  const config = { ...base, ...raw } as RowDetailsConfig & { preset?: string };
  delete config.preset;
  return config.summary || config.tabs || config.files || config.plan ? config : null;
}

/** Wartość pod kluczem "a.b.c". */
export function getIn(row: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (isRecord(node) ? node[part] : undefined), row);
}

/** Klucze wiersza (najwyższego poziomu), które należą wyłącznie do okna "Więcej". */
export function detailOwnedKeys(config: RowDetailsConfig): string[] {
  const keys = new Set<string>();
  const own = (key: string) => keys.add(key.split(".")[0]);
  if (config.tabs) own(config.tabs.key);
  for (const field of config.files?.fields ?? []) own(field.key);
  for (const field of config.summary?.fields ?? []) {
    if (field.key.includes(".") || field.type === "image" || field.type === "textarea" || field.type === "file") own(field.key);
  }
  return [...keys];
}

/**
 * Klucze ukryte w tabeli: te z okna plus obrys na planie (edytowany wizualnie). Obrys NIE należy do
 * detailOwnedKeys — kopiowanie "Więcej" na inny lokal nie przenosi jego położenia na planie.
 */
export function detailHiddenKeys(config: RowDetailsConfig): string[] {
  return [...detailOwnedKeys(config), ...(config.plan ? [config.plan.key] : [])];
}

/** Krótki opis zawartości okna do komórki tabeli: "Parter, Piętro · 2 pliki". */
export function detailsSummary(config: RowDetailsConfig, row: Record<string, unknown>): string {
  const tabs = config.tabs ? visibleTabs({ tabs: getIn(row, config.tabs.key) as UnitCardData["tabs"] }).map((tab) => tab.label.trim()) : [];
  const files = (config.files?.fields ?? []).filter((field) => {
    const value = getIn(row, field.key);
    return typeof value === "string" && value.trim() !== "";
  }).length;
  return [tabs.join(", "), files > 0 ? `${files} ${files === 1 ? "plik" : files < 5 ? "pliki" : "plików"}` : ""].filter(Boolean).join(" · ");
}
