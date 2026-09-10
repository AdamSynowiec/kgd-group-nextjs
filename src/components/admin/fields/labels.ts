import { isEditableValue } from "@/lib/editable";

/**
 * Etykiety pól pochodzą przede wszystkim z danych — z pola "label" zapisanego
 * obok "value"/"editable"/"type" w JSON-ie (czyli w bazie, edytowalne tak samo
 * jak reszta treści — patrz EditableMerge::apply). Słownik poniżej to
 * wyłącznie AWARYJNY fallback dla starszej treści bez "label" — żeby panel nie
 * pokazywał surowych nazw kluczy zanim dane zostaną uzupełnione. Nie dodawaj
 * tu nowych, specyficznych dla projektu pól — właściwe miejsce na nowy podpis
 * to "label" w JSON-ie, nie ten plik.
 */
const FIELD_LABELS: Record<string, string> = {
  title: "Tytuł",
  description: "Opis",
  heading: "Nagłówek",
  lead: "Wprowadzenie",
  eyebrow: "Etykieta nad nagłówkiem",
  seo: "SEO",
  sections: "Sekcje",
  nav: "Nawigacja",
  label: "Etykieta",
  text: "Treść",
  question: "Pytanie",
  answer: "Odpowiedź",
  blocks: "Bloki treści",
  items: "Elementy",
  component: "Typ sekcji",
};

/** Nazwy typów sekcji (pole "component") -> czytelna, polska nazwa. Nieznany typ pokazuje się bez zmian. */
const COMPONENT_LABELS: Record<string, string> = {
  Hero: "Sekcja powitalna",
  RichText: "Blok tekstowy",
  FAQ: "Pytania i odpowiedzi",
};

/** "internalId" -> "Internal id" — heurystyka, awaryjna dla kluczy spoza FIELD_LABELS. */
export function humanizeKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? humanizeKey(key);
}

/** Krótka, samodzielna nazwa elementu tablicy (np. sekcji) — z danych ("label" w JSON-ie ma pierwszeństwo), potem z typu komponentu, tytułu albo numeru porządkowego. */
export function describeArrayItem(item: unknown, fallback: string): string {
  if (item !== null && typeof item === "object" && !Array.isArray(item) && !isEditableValue(item)) {
    const record = item as Record<string, unknown>;

    if (typeof record.label === "string" && record.label.trim() !== "") {
      return record.label;
    }

    if (typeof record.component === "string") {
      return COMPONENT_LABELS[record.component] ?? record.component;
    }

    if (typeof record.title === "string") return record.title;
  }

  return fallback;
}

/** Nazwa grupy dla pól zagnieżdżonego obiektu — "label" w danych ma pierwszeństwo przed nazwą klucza. */
export function groupLabelFor(childKey: string, value: Record<string, unknown>): string {
  if (typeof value.label === "string" && value.label.trim() !== "") {
    return value.label;
  }
  return labelFor(childKey);
}
