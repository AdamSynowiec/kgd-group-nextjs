"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Button, Container, Eyebrow, NUM, Reveal, SectionHeader } from "./ui";

type Building = { id: string; name: string; x: number | string; y: number | string; w: number | string; h: number | string; rotate?: number | string; image?: string; summary?: string };
type Unit = { unit: string; building: string; floor: string; rooms: string | number; area: string | number; extras?: string; status: string; price?: string; link?: string; image?: string };

type ApartmentsFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  buildings?: EditableValue<Building[]> | Building[];
  units?: EditableValue<Unit[]> | Unit[];
  listHeader?: EditableValue<string> | string;
  prospectusLabel?: EditableValue<string> | string;
  prospectusUrl?: EditableValue<string> | string;
  prospectusRequestLabel?: EditableValue<string> | string;
  disclaimer?: EditableValue<string> | string;
};

type StatusKey = "available" | "reserved" | "sold";

const STATUS: Record<StatusKey, { label: string; dot: string; badge: string; fill: string; stroke: string }> = {
  available: { label: "Dostępny", dot: "bg-[#E7E7E7]", badge: "border-[#BCC0C1]/60 bg-[#BCC0C1]/15 text-[#E7E7E7]", fill: "#BCC0C1", stroke: "#F7F7F7" },
  reserved: { label: "Rezerwacja", dot: "bg-[#8E9396]", badge: "border-dashed border-[#BCC0C1]/70 bg-transparent text-[#BCC0C1]", fill: "#6F767A", stroke: "#BCC0C1" },
  sold: { label: "Sprzedany", dot: "bg-[#555859]", badge: "border-[#555859]/50 bg-[#555859]/10 text-[#8E9396]", fill: "#33383B", stroke: "#555859" },
};

function statusOf(raw: string): StatusKey {
  const value = raw.trim().toLowerCase();
  if (value.startsWith("sprzed")) return "sold";
  if (value.startsWith("rezerw") || value.startsWith("zarezerw")) return "reserved";
  return "available";
}

const num = (value: number | string | undefined, fallback = 0) => {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const formatArea = (value: number | string) => `${num(value).toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} m²`;

const PLAN_W = 1200;
const PLAN_H = 640;

type SortKey = "unit" | "building" | "rooms" | "area" | "status";

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

/**
 * "Dostępne mieszkania": interaktywny plan zabudowy (SVG) z podświetleniem i kartą budynku po najechaniu,
 * lista lokali z filtrami i sortowaniem (na telefonie jako karty), karta lokalu w oknie modalnym
 * oraz przycisk prospektu. Wszystkie dane (budynki, lokale, statusy, ceny) pochodzą z pól edytowalnych w panelu.
 */
export default function Apartments({ fields, id }: { fields: ApartmentsFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const buildings = unwrap(fields.buildings) ?? [];
  const units = unwrap(fields.units) ?? [];
  const listHeader = unwrap(fields.listHeader);
  const prospectusLabel = unwrap(fields.prospectusLabel);
  const prospectusUrl = unwrap(fields.prospectusUrl);
  const prospectusRequestLabel = unwrap(fields.prospectusRequestLabel);
  const disclaimer = unwrap(fields.disclaimer);

  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [rooms, setRooms] = useState<string>("all");
  const [sort, setSort] = useState<SortState>({ key: "unit", dir: 1 });
  const [open, setOpen] = useState<Unit | null>(null);

  const byBuilding = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const unit of units) map.set(unit.building, [...(map.get(unit.building) ?? []), unit]);
    return map;
  }, [units]);

  const summaryOf = useCallback(
    (buildingId: string) => {
      const list = byBuilding.get(buildingId) ?? [];
      const available = list.filter((unit) => statusOf(unit.status) === "available").length;
      const reserved = list.filter((unit) => statusOf(unit.status) === "reserved").length;
      const areas = list.map((unit) => num(unit.area)).filter(Boolean);
      const roomCounts = list.map((unit) => num(unit.rooms)).filter(Boolean);
      const state: StatusKey = available > 0 ? "available" : reserved > 0 ? "reserved" : "sold";
      return {
        total: list.length,
        available,
        reserved,
        state,
        minArea: areas.length ? Math.min(...areas) : 0,
        maxArea: areas.length ? Math.max(...areas) : 0,
        minRooms: roomCounts.length ? Math.min(...roomCounts) : 0,
        maxRooms: roomCounts.length ? Math.max(...roomCounts) : 0,
      };
    },
    [byBuilding]
  );

  const roomOptions = useMemo(() => Array.from(new Set(units.map((unit) => String(num(unit.rooms))))).filter((value) => value !== "0").sort((a, b) => Number(a) - Number(b)), [units]);

  const rows = useMemo(() => {
    const filtered = units.filter((unit) => (!selected || unit.building === selected) && (rooms === "all" || String(num(unit.rooms)) === rooms) && (!onlyAvailable || statusOf(unit.status) === "available"));
    const order: Record<StatusKey, number> = { available: 0, reserved: 1, sold: 2 };
    return [...filtered].sort((a, b) => {
      let result = 0;
      if (sort.key === "area" || sort.key === "rooms") result = num(a[sort.key]) - num(b[sort.key]);
      else if (sort.key === "status") result = order[statusOf(a.status)] - order[statusOf(b.status)];
      else result = String(a[sort.key]).localeCompare(String(b[sort.key]), "pl", { numeric: true });
      return result * sort.dir;
    });
  }, [units, selected, rooms, onlyAvailable, sort]);

  const toggleSort = (key: SortKey) => setSort((current) => (current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  const activeId = hovered ?? selected;
  const activeBuilding = buildings.find((building) => building.id === activeId);
  const activeSummary = activeBuilding ? summaryOf(activeBuilding.id) : null;
  const selectedBuilding = buildings.find((building) => building.id === selected);

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

        {/* ───────── Interaktywny plan zabudowy ───────── */}
        <Reveal delay={0.1} className="mt-16 grid gap-6 lg:grid-cols-12">
          <div className="relative lg:col-span-8">
            <div className="relative overflow-hidden border border-[#BCC0C1]/30 bg-[#26292B] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
              <svg viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} className="block h-auto w-full" role="group" aria-label="Plan zabudowy — wybierz budynek">
                <defs>
                  <linearGradient id="fh-grass" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#2E3335" />
                    <stop offset="1" stopColor="#1E2224" />
                  </linearGradient>
                  <linearGradient id="fh-fairway" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#3A4043" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#2C3133" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="fh-lake" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#4B5A60" />
                    <stop offset="1" stopColor="#33414A" />
                  </linearGradient>
                  <pattern id="fh-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="#BCC0C1" strokeOpacity="0.06" strokeWidth="1" />
                  </pattern>
                  <filter id="fh-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="9" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="fh-shadow" x="-30%" y="-30%" width="160%" height="180%">
                    <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
                  </filter>
                </defs>

                <rect width={PLAN_W} height={PLAN_H} fill="url(#fh-grass)" />
                <rect width={PLAN_W} height={PLAN_H} fill="url(#fh-grid)" />

                {/* Pole golfowe: fairwaye, bunkry, warstwice */}
                <path d="M-20 90 C 180 40, 340 150, 560 110 S 900 40, 1220 120 L1220 -20 L-20 -20 Z" fill="url(#fh-fairway)" opacity="0.6" />
                <path d="M-20 300 C 140 240, 300 330, 470 290 S 760 220, 960 270 S 1140 310, 1220 280 L1220 420 C 1000 450, 760 380, 520 430 S 160 470, -20 430 Z" fill="url(#fh-fairway)" />
                <path d="M-20 560 C 200 520, 400 600, 640 560 S 1000 520, 1220 570 L1220 660 L-20 660 Z" fill="url(#fh-fairway)" opacity="0.75" />
                {[0, 1, 2, 3].map((i) => (
                  <path key={i} d={`M-20 ${180 + i * 14} C 220 ${120 + i * 14}, 420 ${230 + i * 14}, 700 ${170 + i * 14} S 1000 ${120 + i * 14}, 1220 ${190 + i * 14}`} fill="none" stroke="#E7E7E7" strokeOpacity="0.07" strokeWidth="1" />
                ))}
                <ellipse cx="330" cy="332" rx="46" ry="20" fill="#8E9396" opacity="0.32" transform="rotate(-12 330 332)" />
                <ellipse cx="860" cy="226" rx="38" ry="16" fill="#8E9396" opacity="0.3" transform="rotate(14 860 226)" />
                <ellipse cx="610" cy="600" rx="52" ry="18" fill="#8E9396" opacity="0.28" transform="rotate(-6 610 600)" />

                {/* Jezioro */}
                <path d="M930 40 C 1030 10, 1150 50, 1190 130 C 1215 200, 1150 270, 1060 262 C 970 256, 900 200, 905 130 C 908 90, 900 56, 930 40 Z" fill="url(#fh-lake)" />
                <path d="M960 100 C 1010 80, 1090 90, 1130 130" fill="none" stroke="#BCC0C1" strokeOpacity="0.35" strokeWidth="1.2" />
                <path d="M950 140 C 1000 120, 1070 130, 1110 168" fill="none" stroke="#BCC0C1" strokeOpacity="0.25" strokeWidth="1" />

                {/* Drzewa — kępy sosen */}
                {[
                  [60, 90, 18], [95, 120, 14], [40, 150, 12], [1100, 400, 18], [1140, 440, 14], [1060, 440, 12], [60, 610, 16], [110, 590, 12], [1150, 600, 16], [1100, 570, 12], [700, 40, 13], [735, 62, 10], [20, 360, 14],
                ].map(([cx, cy, r], i) => (
                  <g key={i} opacity="0.9">
                    <circle cx={cx} cy={cy} r={r} fill="#141719" />
                    <circle cx={cx - 2} cy={cy - 2} r={r * 0.62} fill="#22272A" />
                  </g>
                ))}

                {/* Droga dojazdowa */}
                <path d="M-20 548 C 240 478, 430 566, 650 470 S 990 436, 1220 476" fill="none" stroke="#111416" strokeWidth="26" strokeLinecap="round" opacity="0.65" />
                <path d="M-20 548 C 240 478, 430 566, 650 470 S 990 436, 1220 476" fill="none" stroke="#E7E7E7" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
                <text x="26" y="586" fill="#E7E7E7" fillOpacity="0.55" fontSize="13" letterSpacing="4" fontFamily="var(--manrope-src), sans-serif">DROGA DOJAZDOWA</text>
                <text x="948" y="150" fill="#BCC0C1" fillOpacity="0.55" fontSize="12" letterSpacing="5" fontFamily="var(--manrope-src), sans-serif">JEZIORO</text>

                {/* Budynki */}
                {buildings.map((building) => {
                  const x = num(building.x);
                  const y = num(building.y);
                  const w = num(building.w, 150);
                  const h = num(building.h, 84);
                  const rotate = num(building.rotate);
                  const summary = summaryOf(building.id);
                  const palette = STATUS[summary.state];
                  const isActive = activeId === building.id;
                  const isSelected = selected === building.id;
                  const dim = activeId !== null && !isActive;
                  return (
                    <g
                      key={building.id}
                      transform={`rotate(${rotate} ${x + w / 2} ${y + h / 2})`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${building.name}: dostępnych lokali ${summary.available} z ${summary.total}`}
                      aria-pressed={isSelected}
                      onMouseEnter={() => setHovered(building.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(building.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setSelected((current) => (current === building.id ? null : building.id))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelected((current) => (current === building.id ? null : building.id));
                        }
                      }}
                      style={{ cursor: "pointer", opacity: dim ? 0.55 : 1, transition: "opacity .4s" }}
                      className="outline-none"
                    >
                      {isActive && <rect x={x - 10} y={y - 10} width={w + 20} height={h + 20} rx="6" fill={palette.fill} opacity="0.25" filter="url(#fh-glow)" />}
                      <rect x={x + 6} y={y + 10} width={w} height={h} rx="3" fill="#000" opacity="0.5" filter="url(#fh-shadow)" />
                      {/* garaż (niższa, ciemniejsza bryła przy domu) */}
                      <rect x={x - w * 0.26} y={y + h * 0.3} width={w * 0.3} height={h * 0.62} rx="2" fill={palette.fill} fillOpacity={isActive ? 0.9 : 0.6} stroke={isSelected || isActive ? "#F7F7F7" : palette.stroke} strokeWidth="1" />
                      <rect x={x} y={y} width={w} height={h} rx="3" fill={palette.fill} fillOpacity={isActive ? 1 : 0.9} stroke={isSelected || isActive ? "#F7F7F7" : palette.stroke} strokeWidth={isSelected ? 2.5 : 1.4} style={{ transition: "all .3s" }} />
                      {/* dach dwuspadowy: jedna połać jaśniejsza, druga w cieniu, kalenica pośrodku */}
                      <rect x={x} y={y} width={w} height={h / 2} rx="3" fill="#171A1C" fillOpacity="0.22" />
                      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke="#F7F7F7" strokeOpacity="0.6" strokeWidth="1.5" />
                      <rect x={x} y={y} width={w} height="3" rx="1.5" fill="#F7F7F7" fillOpacity="0.35" />
                      {/* taras z jacuzzi */}
                      <rect x={x + w * 0.08} y={y + h + 2} width={w * 0.5} height="15" rx="2" fill="#E7E7E7" fillOpacity="0.5" />
                      <circle cx={x + w * 0.72} cy={y + h + 10} r="7" fill="#BCC0C1" fillOpacity="0.8" />
                      <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" fill="#171A1C" fontSize="30" fontWeight="600" fontFamily="var(--dmserif-src), serif" style={{ pointerEvents: "none" }}>
                        {building.id}
                      </text>
                    </g>
                  );
                })}

                {/* Róża wiatrów i skala */}
                <g transform="translate(1126 560)" opacity="0.8">
                  <circle r="30" fill="none" stroke="#E7E7E7" strokeOpacity="0.4" />
                  <path d="M0 -26 L7 6 L0 0 L-7 6 Z" fill="#E7E7E7" />
                  <text y="-36" textAnchor="middle" fill="#E7E7E7" fontSize="13" letterSpacing="2" fontFamily="var(--manrope-src), sans-serif">N</text>
                </g>
                <g transform="translate(30 30)" opacity="0.7">
                  <line x1="0" y1="0" x2="120" y2="0" stroke="#E7E7E7" strokeWidth="1.4" />
                  <line x1="0" y1="-5" x2="0" y2="5" stroke="#E7E7E7" />
                  <line x1="120" y1="-5" x2="120" y2="5" stroke="#E7E7E7" />
                  <text x="0" y="22" fill="#E7E7E7" fontSize="11" letterSpacing="3" fontFamily="var(--manrope-src), sans-serif">0 — 50 m</text>
                </g>
              </svg>

              {/* Karta budynku po najechaniu / wybraniu */}
              <AnimatePresence>
                {activeBuilding && activeSummary && (() => {
                  const cx = ((num(activeBuilding.x) + num(activeBuilding.w, 150) / 2) / PLAN_W) * 100;
                  const cy = (num(activeBuilding.y) / PLAN_H) * 100;
                  const below = cy < 38;
                  const alignRight = cx > 66;
                  const palette = STATUS[activeSummary.state];
                  return (
                    <motion.div
                      key={activeBuilding.id}
                      initial={{ opacity: 0, y: below ? -8 : 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="pointer-events-none absolute z-10 hidden w-[270px] border border-[#BCC0C1]/50 bg-[#171A1C]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-md sm:block"
                      style={{
                        left: `${cx}%`,
                        top: below ? `${cy + 18}%` : `${cy}%`,
                        transform: `translate(${alignRight ? "-100%" : "-50%"}, ${below ? "0" : "calc(-100% - 14px)"})`,
                      }}
                    >
                      {activeBuilding.image && <img src={activeBuilding.image} alt="" className="aspect-[16/9] w-full object-cover" />}
                      <div className="p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-dmserif text-[19px] text-[#E7E7E7]">{activeBuilding.name}</h3>
                          <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] ${palette.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
                            {palette.label}
                          </span>
                        </div>
                        {activeBuilding.summary && <p className="mt-2 text-[12px] font-light leading-relaxed text-[#E7E7E7]/65">{activeBuilding.summary}</p>}
                        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#BCC0C1]/20 pt-4 text-[11px]">
                          <div>
                            <dt className="uppercase tracking-[0.2em] text-[#BCC0C1]/80">Dostępne</dt>
                            <dd className={`mt-1 ${NUM} text-[22px] text-[#E7E7E7]`}>
                              {activeSummary.available} <span className="text-[13px] text-[#E7E7E7]/50">/ {activeSummary.total}</span>
                            </dd>
                          </div>
                          <div>
                            <dt className="uppercase tracking-[0.2em] text-[#BCC0C1]/80">Metraż</dt>
                            <dd className={`mt-1 whitespace-nowrap ${NUM} text-[20px] text-[#E7E7E7]`}>
                              {activeSummary.minArea === activeSummary.maxArea ? formatArea(activeSummary.minArea) : `${num(activeSummary.minArea).toLocaleString("pl-PL")}–${formatArea(activeSummary.maxArea)}`}
                            </dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[#E7E7E7]/40">Kliknij, aby filtrować listę</p>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>

            {/* Legenda */}
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-[11px] font-light uppercase tracking-[0.25em] text-[#E7E7E7]/65">
              {(Object.keys(STATUS) as StatusKey[]).map((key) => (
                <span key={key} className="flex items-center gap-2.5">
                  <span className="h-3 w-3" style={{ background: STATUS[key].fill, boxShadow: `0 0 0 1px ${STATUS[key].stroke}` }} />
                  {STATUS[key].label}
                </span>
              ))}
            </div>
          </div>

          {/* Panel boczny: wybór budynku i lokale w nim */}
          <aside className="lg:col-span-4" aria-label="Budynki i lokale">
            <Eyebrow>Budynki</Eyebrow>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors ${selected === null ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 text-[#E7E7E7]/80 hover:border-[#E7E7E7]"}`}
              >
                Wszystkie
              </button>
              {buildings.map((building) => {
                const summary = summaryOf(building.id);
                return (
                  <button
                    key={building.id}
                    type="button"
                    onMouseEnter={() => setHovered(building.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected((current) => (current === building.id ? null : building.id))}
                    aria-pressed={selected === building.id}
                    className={`flex items-center gap-2 border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-colors ${
                      selected === building.id ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 text-[#E7E7E7]/80 hover:border-[#E7E7E7]"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${STATUS[summary.state].dot}`} />
                    {building.id}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 border border-[#BCC0C1]/25 bg-[#26292B]/60 p-6">
              <AnimatePresence mode="wait">
                <motion.div key={selected ?? "all"} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <h3 className="font-dmserif text-[24px] text-[#E7E7E7]">{selectedBuilding ? selectedBuilding.name : "Wszystkie budynki"}</h3>
                  {selectedBuilding?.summary && <p className="mt-2 text-[13px] font-light leading-relaxed text-[#E7E7E7]/60">{selectedBuilding.summary}</p>}
                  <ul className="mt-5 divide-y divide-[#BCC0C1]/15">
                    {(selected ? byBuilding.get(selected) ?? [] : units).slice(0, 8).map((unit) => {
                      const state = STATUS[statusOf(unit.status)];
                      return (
                        <li key={unit.unit}>
                          <button type="button" onClick={() => setOpen(unit)} className="group flex w-full items-center gap-4 py-3.5 text-left">
                            <span className={`h-2 w-2 flex-none rounded-full ${state.dot}`} />
                            <span className="flex-1">
                              <span className="block font-dmserif text-[16px] text-[#E7E7E7] transition-colors group-hover:text-[#E7E7E7]">Lokal {unit.unit}</span>
                              <span className="block text-[11px] font-light tracking-wide text-[#E7E7E7]/50">
                                {unit.floor} · {num(unit.rooms)} pok. · {formatArea(unit.area)}
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

        {/* ───────── Lista lokali ───────── */}
        <div className="mt-28 sm:mt-36" id="lista-lokali">
          <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <Eyebrow>{listHeader ?? "Lista lokali"}</Eyebrow>
              <h3 className="mt-5 font-dmserif text-[32px] font-medium text-[#E7E7E7] sm:text-[42px]">
                <span className={NUM}>{rows.length}</span> {rows.length === 1 ? "lokal" : rows.length > 1 && rows.length < 5 ? "lokale" : "lokali"}
                {selectedBuilding && <span className="font-dmserif font-light italic text-[#BCC0C1]"> · {selectedBuilding.name}</span>}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-[11px] uppercase tracking-[0.25em] text-[#E7E7E7]/70">
              <div className="flex items-center gap-2" role="group" aria-label="Liczba pokoi">
                <span className="text-[#BCC0C1]">Pokoje</span>
                {["all", ...roomOptions].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setRooms(option)}
                    aria-pressed={rooms === option}
                    className={`h-9 min-w-9 border px-2.5 transition-colors ${rooms === option ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 hover:border-[#E7E7E7]"}`}
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
          <div className="mt-10 hidden overflow-hidden border border-[#BCC0C1]/25 md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#26292B]">
                <tr className="border-b border-[#BCC0C1]/30">
                  <SortHead label="Lokal" k="unit" sort={sort} onSort={toggleSort} />
                  <SortHead label="Budynek" k="building" sort={sort} onSort={toggleSort} />
                  <th scope="col" className="px-4 py-4 text-left text-[10px] font-medium uppercase tracking-[0.28em] text-[#BCC0C1]">Piętro</th>
                  <SortHead label="Pokoje" k="rooms" sort={sort} onSort={toggleSort} />
                  <SortHead label="Metraż" k="area" sort={sort} onSort={toggleSort} />
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
                      onMouseEnter={() => setHovered(unit.building)}
                      onMouseLeave={() => setHovered(null)}
                      className={`group border-b border-[#BCC0C1]/12 transition-colors duration-300 hover:bg-[#BCC0C1]/[0.07] ${sold ? "opacity-60" : ""}`}
                    >
                      <th scope="row" className="px-4 py-5 text-left font-dmserif text-[18px] font-medium text-[#E7E7E7]">{unit.unit}</th>
                      <td className="px-4 py-5 text-[13px] font-light text-[#E7E7E7]/75">{buildings.find((building) => building.id === unit.building)?.name ?? unit.building}</td>
                      <td className="px-4 py-5 text-[13px] font-light text-[#E7E7E7]/75">{unit.floor}</td>
                      <td className="px-4 py-5 text-[13px] font-light text-[#E7E7E7]/75">{num(unit.rooms)}</td>
                      <td className={`whitespace-nowrap px-4 py-5 ${NUM} text-[20px] text-[#E7E7E7]`}>{formatArea(unit.area)}</td>
                      <td className="max-w-[260px] px-4 py-5 text-[12px] font-light leading-relaxed text-[#E7E7E7]/60">{unit.extras}</td>
                      <td className="px-4 py-5">
                        <span className={`inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] ${state.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                          {state.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-[12px] font-light text-[#E7E7E7]/75">{unit.price}</td>
                      <td className="px-4 py-5 text-right">
                        <button type="button" onClick={() => setOpen(unit)} className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#BCC0C1] transition-all hover:gap-3 hover:text-[#E7E7E7]">
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
                        {buildings.find((building) => building.id === unit.building)?.name ?? unit.building} · {unit.floor}
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
                      <dd className="mt-1 text-[#E7E7E7]/85">{num(unit.rooms)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Metraż</dt>
                      <dd className={`mt-1 ${NUM} text-[20px] text-[#E7E7E7]`}>{formatArea(unit.area)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Dodatkowe powierzchnie</dt>
                      <dd className="mt-1 font-light text-[#E7E7E7]/65">{unit.extras}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Cena</dt>
                      <dd className="mt-1 font-light text-[#E7E7E7]/85">{unit.price}</dd>
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
              className="relative grid max-h-full w-full max-w-5xl overflow-y-auto border border-[#BCC0C1]/40 bg-[#171A1C] shadow-[0_50px_150px_-30px_rgba(0,0,0,1)] md:grid-cols-2"
              onClick={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => setOpen(null)} aria-label="Zamknij" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center border border-[#BCC0C1]/50 bg-[#171A1C]/80 text-[#E7E7E7] transition-colors hover:bg-[#BCC0C1] hover:text-[#171A1C]">
                <Icon name="close" className="h-4 w-4" />
              </button>

              <div className="relative min-h-[260px] bg-[#26292B]">
                {(open.image || buildings.find((building) => building.id === open.building)?.image) && (
                  <img src={open.image || buildings.find((building) => building.id === open.building)?.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C]/70 via-transparent to-transparent" />
              </div>

              <div className="p-8 sm:p-10">
                <Eyebrow>Karta lokalu</Eyebrow>
                <h3 className="mt-5 font-dmserif text-[44px] font-medium leading-none text-[#E7E7E7]">{open.unit}</h3>
                <div className={`mt-5 inline-flex items-center gap-2 border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] ${STATUS[statusOf(open.status)].badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUS[statusOf(open.status)].dot}`} />
                  {STATUS[statusOf(open.status)].label}
                </div>

                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[#BCC0C1]/25 pt-8">
                  {[
                    ["layers", "Budynek", buildings.find((building) => building.id === open.building)?.name ?? open.building],
                    ["facade", "Piętro", open.floor],
                    ["bed", "Pokoje", String(num(open.rooms))],
                    ["area", "Metraż", formatArea(open.area)],
                  ].map(([icon, label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <Icon name={icon} className="mt-0.5 h-5 w-5 flex-none text-[#BCC0C1]" strokeWidth={1} />
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">{label}</dt>
                        <dd className={`mt-1 ${NUM} text-[23px] text-[#E7E7E7]`}>{value}</dd>
                      </div>
                    </div>
                  ))}
                  {open.extras && (
                    <div className="col-span-2">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Dodatkowe powierzchnie</dt>
                      <dd className="mt-1 text-[14px] font-light leading-relaxed text-[#E7E7E7]/75">{open.extras}</dd>
                    </div>
                  )}
                  <div className="col-span-2">
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-[#BCC0C1]">Cena</dt>
                    <dd className="mt-1 font-dmserif text-[24px] text-[#E7E7E7]">{open.price}</dd>
                  </div>
                </dl>

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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
