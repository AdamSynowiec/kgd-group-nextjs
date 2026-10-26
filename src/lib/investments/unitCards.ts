/**
 * Karta lokalu — obiekt "card" w wierszu tabeli lokali (pole "units" z "details": "unitCard").
 * Panel: przycisk "Więcej" w wierszu -> src/components/admin/fields/RowDetailsDialog.tsx; konfiguracja okna: preset "unitCard" w rowDetails.ts;
 * strona: src/components/investments/foxhills/Apartments.tsx.
 *
 * {
 *   prospectusUrl, standardUrl,          — jeden PDF na całą kartę (puste = wspólny plik inwestycji)
 *   tabs: [                              — przyciski karty w tej kolejności, za "Podsumowaniem"
 *     { label: "Parter", image, text, rooms: [{ name: "Salon", area: "32,5" }, ...] },
 *     { label: "Piętro", ... },
 *   ]
 * }
 * Każdy przycisk ma ten sam układ: zdjęcie/rzut, opis i tabela "pomieszczenie | m²" (suma liczy się sama).
 */

export type CardRoom = { name: string; area?: string | number };
export type CardTab = { label: string; image?: string; text?: string; rooms?: CardRoom[] };
export type UnitCardData = { prospectusUrl?: string; standardUrl?: string; tabs?: CardTab[] };

/** Poprzedni format (db/026): płaska tabela zakładek, pomieszczenia jako tekst "Salon: 42,5 | Łazienka: 6,2". */
export type LegacyUnitView = { unit?: string; type?: string; label?: string; image?: string; text?: string; rooms?: string };

/** "42,5" / "42.5 m²" / 42.5 -> 42.5; puste albo nie-liczba -> null. */
export function parseArea(value: string | number | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const parsed = parseFloat(String(value ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function roomsTotal(rooms: CardRoom[] | undefined): number {
  return Math.round((rooms ?? []).reduce((sum, room) => sum + (parseArea(room.area) ?? 0), 0) * 100) / 100;
}

/** Przyciski, które faktycznie pokazujemy (bez pustych nazw). */
export const visibleTabs = (card: UnitCardData | undefined) => (card?.tabs ?? []).filter((tab) => (tab.label ?? "").trim() !== "");

/** "Salon z aneksem kuchennym: 42,5 | Łazienka" -> [{ name, area }]. */
function parseLegacyRooms(raw: string | undefined): CardRoom[] {
  return (raw ?? "")
    .split("|")
    .map((chunk) => {
      const colon = chunk.lastIndexOf(":");
      return { name: (colon > -1 ? chunk.slice(0, colon) : chunk).trim(), area: colon > -1 ? chunk.slice(colon + 1).trim() : "" };
    })
    .filter((room) => room.name);
}

/** Stare zakładki lokalu: własne wiersze (kolumna "unit"), a gdy ich nie ma — wspólne dla typu. */
export function legacyTabs(views: LegacyUnitView[], unit: string, type: string): CardTab[] {
  const rows = views.filter((row) => (row.label ?? "").trim());
  const own = rows.filter((row) => (row.unit ?? "").trim() === unit);
  const chosen = own.length > 0 ? own : rows.filter((row) => !(row.unit ?? "").trim() && (row.type ?? "").trim() === type);
  return chosen.map((row) => ({ label: (row.label ?? "").trim(), image: row.image ?? "", text: row.text ?? "", rooms: parseLegacyRooms(row.rooms) }));
}
