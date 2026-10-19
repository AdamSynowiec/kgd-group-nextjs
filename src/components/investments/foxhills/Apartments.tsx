"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Button, Container, Eyebrow, NUM, Reveal, SectionHeader } from "./ui";

/** Strefa na planie: jeden lub kilka wielokątów we współrzędnych zdjęcia ("x,y x,y ..." rozdzielone znakiem |). */
type Zone = { id: string; name: string; kind?: string; polygons?: string; image?: string; summary?: string };
type UnitType = { name: string; kind: string; pum: string | number; pricePerM2: string | number; image?: string; ground?: string; upper?: string; summary?: string };
type Unit = {
  unit: string;
  type: string;
  zone: string;
  floor: string;
  rooms: string | number;
  area: string | number;
  garden?: string | number;
  plot?: string | number;
  status: string;
  pricePerM2?: string | number;
  price?: string;
  layout?: string;
  link?: string;
  image?: string;
  /** Obrys lokalu na planie (współrzędne zdjęcia "x,y x,y ...", kilka wielokątów rozdziel znakiem |). */
  polygon?: string;
};

/**
 * Zakładka karty lokalu (np. "Parter", "Piętro"): przycisk w karcie, który podmienia zdjęcie i opis.
 * Wiersz z "unit" dotyczy jednego lokalu; wiersz z samym "type" — wszystkich lokali tego typu
 * (używany, gdy lokal nie ma własnych wierszy). Kolejność wierszy = kolejność przycisków.
 * "rooms": "Salon z aneksem kuchennym: 42,5 | Łazienka: 6,2" — metraż po dwukropku jest opcjonalny.
 */
type UnitView = { unit?: string; type?: string; label: string; image?: string; text?: string; rooms?: string };

type ApartmentsFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  planImage?: EditableValue<string> | string;
  planWidth?: EditableValue<number> | number;
  planHeight?: EditableValue<number> | number;
  planNote?: EditableValue<string> | string;
  zones?: EditableValue<Zone[]> | Zone[];
  types?: EditableValue<UnitType[]> | UnitType[];
  typesHeader?: EditableValue<string> | string;
  units?: EditableValue<Unit[]> | Unit[];
  unitViews?: EditableValue<UnitView[]> | UnitView[];
  summaryLabel?: EditableValue<string> | string;
  listHeader?: EditableValue<string> | string;
  prospectusLabel?: EditableValue<string> | string;
  prospectusUrl?: EditableValue<string> | string;
  prospectusRequestLabel?: EditableValue<string> | string;
  cardProspectusLabel?: EditableValue<string> | string;
  standardLabel?: EditableValue<string> | string;
  standardUrl?: EditableValue<string> | string;
  disclaimer?: EditableValue<string> | string;
};

type StatusKey = "available" | "reserved" | "sold";

const STATUS: Record<StatusKey, { label: string; dot: string; badge: string }> = {
  available: { label: "Dostępny", dot: "bg-[#E7E7E7]", badge: "border-[#BCC0C1]/60 bg-[#BCC0C1]/15 text-[#E7E7E7]" },
  reserved: { label: "Rezerwacja", dot: "bg-[#8E9396]", badge: "border-dashed border-[#BCC0C1]/70 bg-transparent text-[#BCC0C1]" },
  sold: { label: "Sprzedany", dot: "bg-[#555859]", badge: "border-[#555859]/50 bg-[#555859]/10 text-[#8E9396]" },
};

/** Wygląd obrysu lokalu na planie wg statusu (monochromatycznie, w palecie księgi znaku). */
const UNIT_SHAPE: Record<StatusKey, { fill: string; fillActive: string; stroke: string; dash?: string; legend: string }> = {
  available: { fill: "rgba(247,247,247,0.12)", fillActive: "rgba(247,247,247,0.26)", stroke: "rgba(247,247,247,0.85)", legend: "border border-[#F7F7F7]/90 bg-[#F7F7F7]/20" },
  reserved: { fill: "rgba(188,192,193,0.08)", fillActive: "rgba(188,192,193,0.22)", stroke: "rgba(188,192,193,0.9)", dash: "8 6", legend: "border border-dashed border-[#BCC0C1] bg-[#BCC0C1]/10" },
  sold: { fill: "rgba(23,26,28,0.55)", fillActive: "rgba(23,26,28,0.35)", stroke: "rgba(85,88,89,0.9)", legend: "border border-[#555859] bg-[#171A1C]/70" },
};

function statusOf(raw: string): StatusKey {
  const value = raw.trim().toLowerCase();
  if (value.startsWith("sprzed")) return "sold";
  if (value.startsWith("rezerw") || value.startsWith("zarezerw")) return "reserved";
  return "available";
}

const num = (value: number | string | undefined, fallback = 0) => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const fmt = (value: number | string, digits = 2) => num(value).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: digits });
const formatArea = (value: number | string) => `${fmt(value)} m²`;
const formatMoney = (value: number | string) => `${Math.round(num(value)).toLocaleString("pl-PL").replace(/ /g, " ")} zł`;

/** "Salon z aneksem kuchennym: 42,5 | Łazienka" → [{ name, area }] (metraż opcjonalny). */
function parseRooms(raw?: string): { name: string; area: number | null }[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((chunk) => {
      const colon = chunk.lastIndexOf(":");
      const name = (colon > -1 ? chunk.slice(0, colon) : chunk).trim();
      const area = colon > -1 ? num(chunk.slice(colon + 1), NaN) : NaN;
      return { name, area: Number.isFinite(area) && area > 0 ? area : null };
    })
    .filter((room) => room.name);
}

/** Cena łączna: pole "price" z panelu, a gdy puste — PUM × cena za m². */
const totalPrice = (unit: Unit) => unit.price || (num(unit.pricePerM2) > 0 ? formatMoney(num(unit.area) * num(unit.pricePerM2)) : "Cena na zapytanie");

type SortKey = "unit" | "type" | "rooms" | "area" | "status";
type SortState = { key: SortKey; dir: 1 | -1 };

function SortHead({ label, k, sort, onSort }: { label: string; k: SortKey; sort: SortState; onSort: (key: SortKey) => void }) {
  return (
    <th scope="col" className="px-4 py-4 text-left font-manrope text-[10px] font-medium uppercase tracking-[0.28em] text-[#BCC0C1]">
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E7E7E7]" aria-label={`Sortuj: ${label}`}>
        {label}
        <span className={`text-[9px] ${sort.key === k ? "opacity-100" : "opacity-30"}`}>{sort.key === k ? (sort.dir === 1 ? "▲" : "▼") : "▲"}</span>
      </button>
    </th>
  );
}

/** Środek pierwszego wielokąta strefy w procentach rozmiaru planu (do etykiety i karty). */
function zoneCenter(zone: Zone, planW: number, planH: number): { x: number; y: number } | null {
  return polygonCenter(zone.polygons, planW, planH);
}

/** Środek pierwszego wielokąta ("x,y x,y ...|...") w procentach rozmiaru planu. */
function polygonCenter(polygons: string | undefined, planW: number, planH: number): { x: number; y: number } | null {
  const first = (polygons ?? "").split("|")[0]?.trim().split(/\s+/).map((pair) => pair.split(",").map(Number)) ?? [];
  if (first.length < 3 || first.some((point) => point.some(Number.isNaN))) return null;
  return {
    x: (first.reduce((sum, p) => sum + p[0], 0) / first.length / planW) * 100,
    y: (first.reduce((sum, p) => sum + p[1], 0) / first.length / planH) * 100,
  };
}

/**
 * "Dostępne mieszkania": interaktywny plan osiedla (zdjęcie z lotu ptaka z nałożonymi strefami: najechanie pokazuje kartę strefy,
 * kliknięcie filtruje listę), karty typów lokali (willa / bliźniak / apartament), lista lokali z filtrami i sortowaniem
 * (na telefonie jako karty), karta lokalu w oknie modalnym oraz przycisk prospektu. Dane — z pól edytowalnych w panelu.
 */
export default function Apartments({ fields, id }: { fields: ApartmentsFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const planImage = unwrap(fields.planImage);
  const planW = Number(unwrap(fields.planWidth) ?? 1672);
  const planH = Number(unwrap(fields.planHeight) ?? 941);
  const planNote = unwrap(fields.planNote);
  const zones = useMemo(() => unwrap(fields.zones) ?? [], [fields.zones]);
  const types = useMemo(() => unwrap(fields.types) ?? [], [fields.types]);
  const typesHeader = unwrap(fields.typesHeader);
  const units = useMemo(() => unwrap(fields.units) ?? [], [fields.units]);
  const unitViews = useMemo(() => (unwrap(fields.unitViews) ?? []).filter((view) => view.label?.trim()), [fields.unitViews]);
  const summaryLabel = unwrap(fields.summaryLabel) || "Podsumowanie";
  const listHeader = unwrap(fields.listHeader);
  const prospectusLabel = unwrap(fields.prospectusLabel);
  const prospectusUrl = unwrap(fields.prospectusUrl);
  const prospectusRequestLabel = unwrap(fields.prospectusRequestLabel);
  // Przyciski w karcie lokalu: PDF, gdy jest adres; bez pliku — prośba przez formularz kontaktowy.
  const cardProspectusLabel = unwrap(fields.cardProspectusLabel) || "Prospekt informacyjny";
  const standardLabel = unwrap(fields.standardLabel) || "Standard wykończenia";
  const standardUrl = unwrap(fields.standardUrl);
  const disclaimer = unwrap(fields.disclaimer);

  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: "unit", dir: 1 });
  const [open, setOpen] = useState<Unit | null>(null);
  // Zakładka karty lokalu: 0 = podsumowanie, 1..n = wiersze z unitViews. Nowy lokal zawsze startuje od podsumowania.
  const [view, setView] = useState(0);
  const [viewFor, setViewFor] = useState<Unit | null>(null);
  if (open !== viewFor) {
    setViewFor(open);
    setView(0);
  }

  const typeNames = useMemo(() => Array.from(new Set(units.map((unit) => unit.type))), [units]);

  const zoneSummary = (zoneId: string) => {
    const list = units.filter((unit) => unit.zone === zoneId);
    const byType = typeNames.map((name) => ({ name, count: list.filter((unit) => unit.type === name).length })).filter((entry) => entry.count > 0);
    return { total: list.length, available: list.filter((unit) => statusOf(unit.status) === "available").length, byType };
  };

  const rows = useMemo(() => {
    const filtered = units.filter((unit) => (!selected || unit.zone === selected) && (typeFilter === "all" || unit.type === typeFilter) && (!onlyAvailable || statusOf(unit.status) === "available"));
    const order: Record<StatusKey, number> = { available: 0, reserved: 1, sold: 2 };
    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sort.key === "area" || sort.key === "rooms") result = num(a[sort.key]) - num(b[sort.key]);
      else if (sort.key === "status") result = order[statusOf(a.status)] - order[statusOf(b.status)];
      else result = String(a[sort.key]).localeCompare(String(b[sort.key]), "pl", { numeric: true });
      return result * sort.dir;
    });
  }, [units, selected, typeFilter, onlyAvailable, sort]);

  const toggleSort = (key: SortKey) => setSort((current) => (current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  const activeId = hovered ?? selected;
  const activeZone = zones.find((zone) => zone.id === activeId);
  const selectedZone = zones.find((zone) => zone.id === selected);
  const zoneName = (zoneId: string) => zones.find((zone) => zone.id === zoneId)?.name ?? zoneId;
  // Lokale z własnym obrysem są rysowane na planie osobno; strefy zostają tylko tam, gdzie żaden lokal nie ma obrysu (np. budynek SPA).
  const unitShapes = units.filter((unit) => unit.polygon?.trim());
  const zonesWithShapes = new Set(unitShapes.map((unit) => unit.zone));
  const interactive = zones.filter((zone) => zone.polygons);
  const zoneShapes = interactive.filter((zone) => !zonesWithShapes.has(zone.id));
  const activeUnit = unitShapes.find((unit) => unit.unit === hoveredUnit);
  const typeOf = (unit: Unit) => types.find((item) => item.kind === unit.type || item.name === unit.type);
  /** Zakładki lokalu: własne wiersze (kolumna "unit"), a gdy ich nie ma — wspólne dla typu (sama kolumna "type"). */
  const viewsFor = (unit: Unit) => {
    const own = unitViews.filter((row) => row.unit?.trim() === unit.unit);
    return own.length > 0 ? own : unitViews.filter((row) => !row.unit?.trim() && row.type?.trim() === unit.type);
  };
  const openViews = open ? viewsFor(open) : [];
  const activeView = view > 0 ? openViews[view - 1] : undefined;
  const summaryImage = open ? open.image || typeOf(open)?.image : undefined;
  const cardImage = activeView?.image || summaryImage;
  const activeRooms = parseRooms(activeView?.rooms);
  const roomsTotal = activeRooms.reduce((sum, room) => sum + (room.area ?? 0), 0);

  // Okno karty lokalu: Escape zamyka, tło strony nie przewija się pod spodem.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <section id={id ?? "apartamenty"} className="relative scroll-mt-20 overflow-hidden bg-[#171A1C] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -right-40 top-0 h-[600px] w-[600px] rounded-full bg-[#BCC0C1]/10 blur-[160px]" />

      <Container className="relative">
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} />
          <Reveal delay={0.2} className="flex-none">
            {prospectusUrl ? (
              <Button href={prospectusUrl} variant="gold" external download>
                <Icon name="download" className="h-4 w-4" />
                {prospectusLabel}
              </Button>
            ) : (
              <Button href="#kontakt" variant="gold">
                <Icon name="download" className="h-4 w-4" />
                {prospectusRequestLabel ?? prospectusLabel}
              </Button>
            )}
          </Reveal>
        </div>

        {/* ───────── Interaktywny plan osiedla ───────── */}
        <Reveal delay={0.1} className="mt-16 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="relative border border-[#BCC0C1]/30 bg-[#26292B] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
              {/* Obraz i strefy przycięte do ramki; karta strefy poniżej może z niej wychodzić */}
              <div className="relative overflow-hidden">
              {planImage && <img src={planImage} alt="Plan I etapu osiedla Fox Hills Residences z lotu ptaka" width={planW} height={planH} className="block h-auto w-full select-none" draggable={false} />}

              <svg viewBox={`0 0 ${planW} ${planH}`} className="absolute inset-0 h-full w-full" role="group" aria-label="Plan osiedla — wybierz strefę">
                <defs>
                  <filter id="fh-zone-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {unitShapes.map((unit) => {
                  const status = statusOf(unit.status);
                  const shape = UNIT_SHAPE[status];
                  const isHovered = hoveredUnit === unit.unit;
                  const inActiveZone = activeId !== null && unit.zone === activeId;
                  const lit = isHovered || inActiveZone;
                  const dim = (hoveredUnit !== null && !isHovered) || (hoveredUnit === null && activeId !== null && unit.zone !== activeId);
                  return (
                    <g
                      key={unit.unit}
                      role="button"
                      tabIndex={0}
                      aria-label={`Lokal ${unit.unit}, ${unit.type}, ${formatArea(unit.area)}, ${STATUS[status].label}`}
                      onMouseEnter={() => setHoveredUnit(unit.unit)}
                      onMouseLeave={() => setHoveredUnit(null)}
                      onFocus={() => setHoveredUnit(unit.unit)}
                      onBlur={() => setHoveredUnit(null)}
                      onClick={() => setOpen(unit)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpen(unit);
                        }
                      }}
                      style={{ cursor: "pointer", opacity: dim ? 0.35 : 1, transition: "opacity .35s" }}
                      className="outline-none"
                    >
                      {(unit.polygon ?? "").split("|").map((points, index) => (
                        <polygon
                          key={index}
                          points={points.trim()}
                          fill={lit ? shape.fillActive : shape.fill}
                          stroke={lit ? "#F7F7F7" : shape.stroke}
                          strokeWidth={lit ? 4 : 2.4}
                          strokeDasharray={shape.dash}
                          strokeLinejoin="round"
                          filter={isHovered ? "url(#fh-zone-glow)" : undefined}
                          style={{ transition: "all .3s" }}
                        />
                      ))}
                    </g>
                  );
                })}
                {zoneShapes.map((zone) => {
                  const isActive = activeId === zone.id;
                  const isSelected = selected === zone.id;
                  const dim = (activeId !== null && !isActive) || hoveredUnit !== null;
                  return (
                    <g
                      key={zone.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${zone.name}: ${zoneSummary(zone.id).total} lokali`}
                      aria-pressed={isSelected}
                      onMouseEnter={() => setHovered(zone.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(zone.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setSelected((current) => (current === zone.id ? null : zone.id))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected((current) => (current === zone.id ? null : zone.id));
                        }
                      }}
                      style={{ cursor: "pointer", opacity: dim ? 0.45 : 1, transition: "opacity .4s" }}
                      className="outline-none"
                    >
                      {(zone.polygons ?? "").split("|").map((points, index) => (
                        <polygon
                          key={index}
                          points={points.trim()}
                          fill={isActive ? "rgba(231,231,231,0.34)" : "rgba(231,231,231,0.10)"}
                          stroke={isActive || isSelected ? "#F7F7F7" : "rgba(231,231,231,0.7)"}
                          strokeWidth={isSelected ? 4 : isActive ? 3 : 2}
                          strokeDasharray={isActive || isSelected ? "0" : "10 8"}
                          strokeLinejoin="round"
                          filter={isActive ? "url(#fh-zone-glow)" : undefined}
                          style={{ transition: "all .3s" }}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>

              {/* Numery lokali na obrysach (od lg — na mniejszym planie byłyby nieczytelne) */}
              {unitShapes.map((unit) => {
                const center = polygonCenter(unit.polygon, planW, planH);
                if (!center) return null;
                return (
                  <span
                    key={unit.unit}
                    className={`pointer-events-none absolute z-[5] hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-[#171A1C]/75 px-1.5 py-0.5 font-manrope text-[9px] font-medium tracking-[0.12em] text-[#F7F7F7] transition-opacity duration-300 lg:block ${
                      hoveredUnit === unit.unit ? "opacity-0" : hoveredUnit !== null ? "opacity-40" : "opacity-100"
                    }`}
                    style={{ left: `${center.x}%`, top: `${center.y}%` }}
                  >
                    {unit.unit.replace(/^I\./, "")}
                  </span>
                );
              })}

              {/* Etykiety stref */}
              {zoneShapes.map((zone) => {
                const center = zoneCenter(zone, planW, planH);
                if (!center) return null;
                return (
                  <span
                    key={zone.id}
                    className={`pointer-events-none absolute z-[5] hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap border border-[#E7E7E7]/50 bg-[#171A1C]/80 px-3 py-1.5 font-manrope text-[10px] font-medium uppercase tracking-[0.25em] text-[#E7E7E7] backdrop-blur-sm transition-opacity duration-300 sm:block ${activeId === zone.id ? "opacity-0" : "opacity-100"}`}
                    style={{ left: `${center.x}%`, top: `${center.y}%` }}
                  >
                    {zone.name}
                  </span>
                );
              })}

              </div>

              {/* Mini-karta lokalu po najechaniu na obrys */}
              <AnimatePresence>
                {activeUnit && (() => {
                  const center = polygonCenter(activeUnit.polygon, planW, planH) ?? { x: 50, y: 50 };
                  const above = center.y > 45;
                  const alignRight = center.x > 62;
                  const state = STATUS[statusOf(activeUnit.status)];
                  return (
                    <motion.div
                      key={activeUnit.unit}
                      initial={{ opacity: 0, y: above ? 8 : -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute z-30 hidden w-[260px] border border-[#BCC0C1]/50 bg-[#171A1C]/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md sm:block"
                      style={{
                        left: `${center.x}%`,
                        top: `${center.y}%`,
                        transform: `translate(${alignRight ? "calc(-100% - 20px)" : "20px"}, ${above ? "calc(-100% + 20px)" : "-20px"})`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-dmserif text-[26px] leading-none text-[#E7E7E7]">{activeUnit.unit}</h3>
                        <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] ${state.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                          {state.label}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#E7E7E7]/55">
                        {activeUnit.type} · {activeUnit.floor}
                      </p>
                      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#BCC0C1]/20 pt-4">
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.2em] text-[#BCC0C1]/80">PUM</dt>
                          <dd className={`mt-1 ${NUM} text-[20px] text-[#E7E7E7]`}>{formatArea(activeUnit.area)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.2em] text-[#BCC0C1]/80">{num(activeUnit.garden) > 0 ? "Ogród" : "Pokoje"}</dt>
                          <dd className={`mt-1 ${NUM} text-[20px] text-[#E7E7E7]`}>{num(activeUnit.garden) > 0 ? formatArea(activeUnit.garden ?? 0) : num(activeUnit.rooms)}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-[10px] uppercase tracking-[0.2em] text-[#BCC0C1]/80">Cena</dt>
                          <dd className={`mt-1 ${NUM} text-[20px] text-[#E7E7E7]`}>{totalPrice(activeUnit)}</dd>
                        </div>
                      </dl>
                      <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-[#E7E7E7]/40">Kliknij, aby otworzyć kartę lokalu</p>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Karta strefy po najechaniu / wybraniu */}
              <AnimatePresence>
                {activeZone && !activeUnit && (() => {
                  const center = zoneCenter(activeZone, planW, planH) ?? { x: 50, y: 50 };
                  const above = center.y > 45;
                  const alignRight = center.x > 62;
                  const summary = zoneSummary(activeZone.id);
                  return (
                    <motion.div
                      key={activeZone.id}
                      initial={{ opacity: 0, y: above ? 8 : -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="pointer-events-none absolute z-30 hidden w-[290px] border border-[#BCC0C1]/50 bg-[#171A1C]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md sm:block"
                      style={{
                        left: `${center.x}%`,
                        top: `${center.y}%`,
                        transform: `translate(${alignRight ? "calc(-100% - 20px)" : "20px"}, ${above ? "calc(-100% + 20px)" : "-20px"})`,
                      }}
                    >
                      {activeZone.image && <img src={activeZone.image} alt="" className="aspect-[16/9] w-full object-cover" />}
                      <div className="p-5">
                        <h3 className="font-dmserif text-[20px] text-[#E7E7E7]">{activeZone.name}</h3>
                        {activeZone.summary && <p className="mt-2 text-[12px] font-light leading-relaxed text-[#E7E7E7]/65">{activeZone.summary}</p>}
                        {summary.total > 0 && (
                          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#BCC0C1]/20 pt-4 text-[11px]">
                            <div>
                              <dt className="uppercase tracking-[0.2em] text-[#BCC0C1]/80">Dostępne</dt>
                              <dd className={`mt-1 ${NUM} text-[22px] text-[#E7E7E7]`}>
                                {summary.available} <span className="text-[14px] text-[#E7E7E7]/50">/ {summary.total}</span>
                              </dd>
                            </div>
                            <div>
                              <dt className="uppercase tracking-[0.2em] text-[#BCC0C1]/80">Typy</dt>
                              <dd className="mt-1 text-[12px] leading-snug text-[#E7E7E7]/80">{summary.byType.map((entry) => `${entry.count}× ${entry.name}`).join(", ")}</dd>
                            </div>
                          </dl>
                        )}
                        {summary.total > 0 && <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[#E7E7E7]/40">Kliknij, aby filtrować listę</p>}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-light uppercase tracking-[0.25em] text-[#E7E7E7]/65">
              {unitShapes.length > 0 ? (
                (Object.keys(UNIT_SHAPE) as StatusKey[]).map((key) => (
                  <span key={key} className="flex items-center gap-2.5">
                    <span className={`h-3 w-5 ${UNIT_SHAPE[key].legend}`} />
                    {STATUS[key].label}
                  </span>
                ))
              ) : (
                <span className="flex items-center gap-2.5">
                  <span className="h-3 w-5 border border-dashed border-[#E7E7E7]/70 bg-[#E7E7E7]/10" />
                  Budynki I etapu
                </span>
              )}
              <span className="flex items-center gap-2.5">
                <span className="h-3 w-5 bg-[#E7E7E7]/45" />
                Kolejne etapy
              </span>
              {planNote && <span className="normal-case tracking-normal text-[#E7E7E7]/45">{planNote}</span>}
            </div>
          </div>

          {/* Panel boczny: wybór strefy i lokale */}
          <aside className="lg:col-span-4" aria-label="Strefy i lokale">
            <Eyebrow>Strefy osiedla</Eyebrow>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors ${selected === null ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 text-[#E7E7E7]/80 hover:border-[#E7E7E7]"}`}
              >
                Wszystkie
              </button>
              {interactive.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onMouseEnter={() => setHovered(zone.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected((current) => (current === zone.id ? null : zone.id))}
                  aria-pressed={selected === zone.id}
                  className={`border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors ${selected === zone.id ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 text-[#E7E7E7]/80 hover:border-[#E7E7E7]"}`}
                >
                  {zone.name}
                </button>
              ))}
            </div>

            <div className="mt-8 border border-[#BCC0C1]/25 bg-[#26292B]/60 p-6">
              <AnimatePresence mode="wait">
                <motion.div key={selected ?? "all"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h3 className="font-dmserif text-[24px] text-[#E7E7E7]">{selectedZone ? selectedZone.name : "I etap inwestycji"}</h3>
                  {selectedZone?.summary && <p className="mt-2 text-[13px] font-light leading-relaxed text-[#E7E7E7]/60">{selectedZone.summary}</p>}
                  <ul className="mt-5 max-h-[380px] divide-y divide-[#BCC0C1]/15 overflow-y-auto pr-1">
                    {(selected ? units.filter((unit) => unit.zone === selected) : units).map((unit) => {
                      const state = STATUS[statusOf(unit.status)];
                      return (
                        <li key={unit.unit}>
                          <button
                            type="button"
                            onClick={() => setOpen(unit)}
                            onMouseEnter={() => unit.polygon && setHoveredUnit(unit.unit)}
                            onMouseLeave={() => setHoveredUnit(null)}
                            className="group flex w-full items-center gap-4 py-3 text-left"
                          >
                            <span className={`h-2 w-2 flex-none rounded-full ${state.dot}`} />
                            <span className="flex-1">
                              <span className="block font-dmserif text-[16px] text-[#E7E7E7] transition-colors group-hover:text-[#F7F7F7]">{unit.unit}</span>
                              <span className="block text-[11px] font-light tracking-wide text-[#E7E7E7]/50">
                                {unit.type} · {formatArea(unit.area)}
                              </span>
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#E7E7E7]/45">{state.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </aside>
        </Reveal>

        {/* ───────── Typy lokali ───────── */}
        {types.length > 0 && (
          <div className="mt-28 sm:mt-36">
            <Reveal>
              <Eyebrow>{typesHeader ?? "Typy lokali"}</Eyebrow>
            </Reveal>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {types.map((item, index) => (
                <Reveal key={item.name} delay={index * 0.1} className="h-full">
                  <article className="group flex h-full flex-col border border-[#BCC0C1]/25 bg-[#26292B]/60 transition-colors duration-500 hover:border-[#BCC0C1]/60">
                    {item.image && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1600ms] group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C]/80 via-transparent to-transparent" />
                        <h3 className="absolute bottom-5 left-6 font-dmserif text-[28px] text-[#F7F7F7]">{item.name}</h3>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6 sm:p-7">
                      <dl className="grid grid-cols-2 gap-4 border-b border-[#BCC0C1]/20 pb-5">
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Metraż</dt>
                          <dd className={`mt-1 ${NUM} text-[26px] text-[#E7E7E7]`}>{formatArea(item.pum)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Cena</dt>
                          <dd className={`mt-1 ${NUM} text-[26px] text-[#E7E7E7]`}>
                            <span className="mr-1.5 font-manrope text-[13px] font-light lowercase tracking-normal text-[#E7E7E7]/60">od</span>
                            {fmt(item.pricePerM2, 0)} zł/m²
                          </dd>
                        </div>
                      </dl>
                      {item.summary && <p className="mt-5 text-[13px] font-light leading-[1.8] text-[#E7E7E7]/60">{item.summary}</p>}
                      <div className="mt-5 grid gap-5 text-[12px] font-light leading-relaxed text-[#E7E7E7]/75 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        {item.ground && (
                          <div>
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#BCC0C1]">{item.upper ? "Parter" : "Układ"}</div>
                            {item.ground.split(";").map((line) => (
                              <div key={line} className="flex gap-2">
                                <span className="mt-[9px] h-px w-3 flex-none bg-[#BCC0C1]" />
                                {line.trim()}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.upper && (
                          <div>
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#BCC0C1]">Piętro</div>
                            {item.upper.split(";").map((line) => (
                              <div key={line} className="flex gap-2">
                                <span className="mt-[9px] h-px w-3 flex-none bg-[#BCC0C1]" />
                                {line.trim()}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        )}

        {/* ───────── Lista lokali ───────── */}
        <div className="mt-28 sm:mt-36" id="lista-lokali">
          <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <Eyebrow>{listHeader ?? "Lista lokali"}</Eyebrow>
              <h3 className="mt-5 font-dmserif text-[32px] font-medium text-[#E7E7E7] sm:text-[42px]">
                <span className={NUM}>{rows.length}</span> {rows.length === 1 ? "lokal" : rows.length > 1 && rows.length < 5 ? "lokale" : "lokali"}
                {selectedZone && <span className="font-dmserif font-light italic text-[#BCC0C1]"> · {selectedZone.name}</span>}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[11px] uppercase tracking-[0.25em] text-[#E7E7E7]/70">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Typ lokalu">
                <span className="text-[#BCC0C1]">Typ</span>
                {["all", ...typeNames].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTypeFilter(option)}
                    aria-pressed={typeFilter === option}
                    className={`h-9 border px-3 transition-colors ${typeFilter === option ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 hover:border-[#E7E7E7]"}`}
                  >
                    {option === "all" ? "Wszystkie" : option}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} className="peer sr-only" />
                <span className="grid h-5 w-5 place-items-center border border-[#BCC0C1]/60 text-transparent transition-colors peer-checked:bg-[#BCC0C1] peer-checked:text-[#171A1C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#E7E7E7]">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.4} />
                </span>
                Tylko dostępne
              </label>
            </div>
          </Reveal>

          {/* Tabela — desktop */}
          <div className="mt-10 hidden overflow-x-auto border border-[#BCC0C1]/25 md:block">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="bg-[#26292B]">
                <tr className="border-b border-[#BCC0C1]/30">
                  <SortHead label="Lokal" k="unit" sort={sort} onSort={toggleSort} />
                  <SortHead label="Typ" k="type" sort={sort} onSort={toggleSort} />
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-medium uppercase tracking-[0.28em] text-[#BCC0C1]">Piętro</th>
                  <SortHead label="Pokoje" k="rooms" sort={sort} onSort={toggleSort} />
                  <SortHead label="PUM" k="area" sort={sort} onSort={toggleSort} />
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-medium uppercase tracking-[0.28em] text-[#BCC0C1]">Dodatkowe powierzchnie</th>
                  <SortHead label="Status" k="status" sort={sort} onSort={toggleSort} />
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-medium uppercase tracking-[0.28em] text-[#BCC0C1]">Cena</th>
                  <th scope="col" className="px-4 py-4"><span className="sr-only">Szczegóły</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((unit) => {
                  const state = STATUS[statusOf(unit.status)];
                  const sold = statusOf(unit.status) === "sold";
                  return (
                    <tr
                      key={unit.unit}
                      onMouseEnter={() => setHovered(unit.zone)}
                      onMouseLeave={() => setHovered(null)}
                      className={`group border-b border-[#BCC0C1]/12 transition-colors duration-300 hover:bg-[#BCC0C1]/[0.07] ${sold ? "opacity-60" : ""}`}
                    >
                      <th scope="row" className="whitespace-nowrap px-4 py-5 text-left font-dmserif text-[18px] font-medium text-[#E7E7E7]">{unit.unit}</th>
                      <td className="px-4 py-5 text-[13px] font-light text-[#E7E7E7]/75">{unit.type}</td>
                      <td className="px-4 py-5 text-[13px] font-light text-[#E7E7E7]/75">{unit.floor}</td>
                      <td className={`px-4 py-5 ${NUM} text-[18px] text-[#E7E7E7]/85`}>{num(unit.rooms)}</td>
                      <td className={`whitespace-nowrap px-4 py-5 ${NUM} text-[20px] text-[#E7E7E7]`}>{formatArea(unit.area)}</td>
                      <td className="px-4 py-5 text-[12px] font-light leading-relaxed text-[#E7E7E7]/60">
                        {num(unit.garden) > 0 ? <div>Ogród: {formatArea(unit.garden ?? 0)}</div> : <div>Bez ogrodu</div>}
                        {num(unit.plot) > 0 && <div>Działka: {formatArea(unit.plot ?? 0)}</div>}
                      </td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${state.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                          {state.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-[12px] font-light text-[#E7E7E7]/75">
                        <div className={`${NUM} text-[18px] text-[#E7E7E7]`}>{totalPrice(unit)}</div>
                        {num(unit.pricePerM2) > 0 && <div className="mt-0.5 text-[11px] text-[#E7E7E7]/50">{fmt(unit.pricePerM2 ?? 0, 0)} zł/m²</div>}
                      </td>
                      <td className="px-4 py-5 text-right">
                        <button type="button" onClick={() => setOpen(unit)} className="inline-flex items-center gap-2 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.25em] text-[#BCC0C1] transition-all hover:gap-3 hover:text-[#E7E7E7]">
                          Szczegóły <Icon name="arrow" className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-[14px] font-light text-[#E7E7E7]/55">
                      Brak lokali spełniających wybrane kryteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Karty — telefon */}
          <ul className="mt-10 grid gap-4 md:hidden">
            {rows.map((unit) => {
              const state = STATUS[statusOf(unit.status)];
              return (
                <li key={unit.unit} className={`border border-[#BCC0C1]/25 bg-[#26292B]/60 p-5 ${statusOf(unit.status) === "sold" ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-dmserif text-[24px] text-[#E7E7E7]">{unit.unit}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#E7E7E7]/50">
                        {unit.type} · {unit.floor}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] ${state.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                      {state.label}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-[#BCC0C1]/15 pt-4 text-[12px]">
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Pokoje</dt>
                      <dd className={`mt-1 ${NUM} text-[20px] text-[#E7E7E7]/85`}>{num(unit.rooms)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">PUM</dt>
                      <dd className={`mt-1 ${NUM} text-[20px] text-[#E7E7E7]`}>{formatArea(unit.area)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Dodatkowe powierzchnie</dt>
                      <dd className="mt-1 font-light text-[#E7E7E7]/65">
                        {num(unit.garden) > 0 ? `Ogród: ${formatArea(unit.garden ?? 0)}` : "Bez ogrodu"}
                        {num(unit.plot) > 0 && ` · Działka: ${formatArea(unit.plot ?? 0)}`}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Cena</dt>
                      <dd className="mt-1 font-light text-[#E7E7E7]/85">
                        <span className={`${NUM} text-[20px]`}>{totalPrice(unit)}</span>
                        {num(unit.pricePerM2) > 0 && <span className="ml-2 text-[11px] text-[#E7E7E7]/50">{fmt(unit.pricePerM2 ?? 0, 0)} zł/m²</span>}
                      </dd>
                    </div>
                  </dl>
                  <button type="button" onClick={() => setOpen(unit)} className="mt-5 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-[#BCC0C1]">
                    Szczegóły lokalu <Icon name="arrow" className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
            {rows.length === 0 && <li className="py-12 text-center text-[14px] font-light text-[#E7E7E7]/55">Brak lokali spełniających wybrane kryteria.</li>}
          </ul>

          {disclaimer && <p className="mt-8 max-w-4xl text-[12px] font-light leading-relaxed text-[#E7E7E7]/45">{disclaimer}</p>}
        </div>
      </Container>

      {/* ───────── Karta lokalu ───────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fh-unit"
            role="dialog"
            aria-modal="true"
            aria-label={`Lokal ${open.unit}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => setOpen(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`relative grid max-h-full w-full max-w-5xl overflow-y-auto border border-[#BCC0C1]/40 bg-[#171A1C] shadow-[0_50px_150px_-30px_rgba(0,0,0,1)] md:grid-cols-2 ${
                openViews.length > 0 ? "md:h-[min(860px,100%)] md:overflow-hidden" : ""
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => setOpen(null)} aria-label="Zamknij" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-[#BCC0C1]/50 bg-[#171A1C]/80 text-[#E7E7E7] transition-colors hover:bg-[#BCC0C1] hover:text-[#171A1C]">
                <Icon name="close" className="h-4 w-4" />
              </button>

              <div className="relative min-h-[260px] overflow-hidden bg-[#26292B] md:min-h-[520px]">
                <AnimatePresence initial={false}>
                  {cardImage && (
                    <motion.img
                      key={`${view}-${cardImage}`}
                      src={cardImage}
                      alt={activeView ? `${open.unit} — ${activeView.label}` : open.type}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`absolute inset-0 h-full w-full ${activeView?.image ? "object-contain p-4 sm:p-6" : "object-cover"}`}
                    />
                  )}
                </AnimatePresence>
                {!activeView?.image && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#171A1C]/70 via-transparent to-transparent" />}
                {activeView?.image && (
                  <a
                    href={activeView.image}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 left-4 inline-flex items-center gap-2 border border-[#BCC0C1]/50 bg-[#171A1C]/80 px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-[#E7E7E7] transition-colors hover:bg-[#BCC0C1] hover:text-[#171A1C]"
                  >
                    <Icon name="expand" className="h-3.5 w-3.5" /> Powiększ
                  </a>
                )}
              </div>

              <div className={`p-8 sm:p-10 ${openViews.length > 0 ? "md:overflow-y-auto" : ""}`}>
                <Eyebrow>Karta lokalu</Eyebrow>
                <h3 className="mt-5 font-dmserif text-[44px] font-medium leading-none text-[#E7E7E7]">{open.unit}</h3>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] ${STATUS[statusOf(open.status)].badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS[statusOf(open.status)].dot}`} />
                    {STATUS[statusOf(open.status)].label}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.25em] text-[#E7E7E7]/55">{open.type}</span>
                </div>

                {openViews.length > 0 && (
                  <div role="tablist" aria-label="Widoki lokalu" className="-mx-1 mt-7 flex flex-wrap gap-2 px-1">
                    {[summaryLabel, ...openViews.map((row) => row.label)].map((label, index) => (
                      <button
                        key={`${index}-${label}`}
                        type="button"
                        role="tab"
                        aria-selected={view === index}
                        onClick={() => setView(index)}
                        className={`border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors ${
                          view === index ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 text-[#E7E7E7]/80 hover:border-[#E7E7E7]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {activeView ? (
                  <motion.div key={view} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-8 border-t border-[#BCC0C1]/25 pt-8">
                    <h4 className="font-dmserif text-[28px] leading-tight text-[#E7E7E7]">{activeView.label}</h4>
                    {activeView.text && <p className="mt-4 whitespace-pre-line text-[14px] font-light leading-[1.8] text-[#E7E7E7]/75">{activeView.text}</p>}
                    {activeRooms.length > 0 && (
                      <dl className="mt-6">
                        {activeRooms.map((room, index) => (
                          <div key={`${index}-${room.name}`} className="flex items-baseline justify-between gap-6 border-b border-[#BCC0C1]/15 py-3">
                            <dt className="text-[14px] font-light text-[#E7E7E7]/80">{room.name}</dt>
                            {room.area !== null && <dd className={`${NUM} shrink-0 text-[18px] text-[#E7E7E7]`}>{formatArea(room.area)}</dd>}
                          </div>
                        ))}
                        {roomsTotal > 0 && (
                          <div className="flex items-baseline justify-between gap-6 pt-4">
                            <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Razem</dt>
                            <dd className={`${NUM} shrink-0 text-[22px] text-[#E7E7E7]`}>{formatArea(Math.round(roomsTotal * 100) / 100)}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </motion.div>
                ) : (
                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[#BCC0C1]/25 pt-8">
                  {[
                    ["layers", "Strefa", zoneName(open.zone)],
                    ["facade", "Piętro", open.floor],
                    ["bed", "Pokoje", String(num(open.rooms))],
                    ["area", "PUM", formatArea(open.area)],
                  ].map(([icon, label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <Icon name={icon} className="mt-0.5 h-5 w-5 flex-none text-[#BCC0C1]" strokeWidth={1} />
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">{label}</dt>
                        <dd className={`mt-1 ${NUM} text-[22px] text-[#E7E7E7]`}>{value}</dd>
                      </div>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Dodatkowe powierzchnie</dt>
                    <dd className="mt-1 text-[14px] font-light leading-relaxed text-[#E7E7E7]/75">
                      {num(open.garden) > 0 ? `Ogród: ${formatArea(open.garden ?? 0)}` : "Bez ogrodu"}
                      {num(open.plot) > 0 && ` · Działka: ${formatArea(open.plot ?? 0)}`}
                    </dd>
                  </div>
                  {open.layout && (
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Układ</dt>
                      <dd className="mt-1 text-[13px] font-light leading-relaxed text-[#E7E7E7]/70">{open.layout}</dd>
                    </div>
                  )}
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Cena</dt>
                    <dd className={`mt-1 ${NUM} text-[28px] text-[#E7E7E7]`}>{totalPrice(open)}</dd>
                    {num(open.pricePerM2) > 0 && <dd className="mt-1 text-[12px] font-light text-[#E7E7E7]/50">{fmt(open.pricePerM2 ?? 0, 0)} zł/m² · cena = PUM × cena za m²</dd>}
                  </div>
                </dl>
                )}

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                  <Button href="#kontakt" variant="gold" onClick={() => setOpen(null)}>
                    Zapytaj o lokal
                  </Button>
                  {open.link && (
                    <Button href={open.link} variant="outline" external>
                      <Icon name="download" className="h-4 w-4" />
                      Karta lokalu
                    </Button>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                  {[
                    { label: cardProspectusLabel, url: prospectusUrl },
                    { label: standardLabel, url: standardUrl },
                  ].map(({ label, url }) => (
                    <a
                      key={label}
                      href={url || "#kontakt"}
                      onClick={url ? undefined : () => setOpen(null)}
                      {...(url ? { target: "_blank", rel: "noopener noreferrer", download: true } : {})}
                      className="group inline-flex items-center gap-2.5 border-b border-[#BCC0C1]/35 pb-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[#E7E7E7]/85 transition-colors hover:border-[#E7E7E7] hover:text-[#F7F7F7]"
                    >
                      <Icon name={url ? "download" : "mail"} className="h-4 w-4 text-[#BCC0C1] transition-colors group-hover:text-[#F7F7F7]" />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
