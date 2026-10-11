"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Container, SectionHeader } from "./ui";
import type { MapCategory, MapPoint } from "./MapView";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#26292B] text-[11px] uppercase tracking-[0.4em] text-[#BCC0C1]/70">Ładowanie mapy…</div>
  ),
});

type MapFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  center?: EditableValue<[number, number]> | [number, number];
  zoom?: EditableValue<number> | number;
  homeName?: EditableValue<string> | string;
  categories?: EditableValue<MapCategory[]> | MapCategory[];
  points?: EditableValue<MapPoint[]> | MapPoint[];
  listLabel?: EditableValue<string> | string;
};

/**
 * Mapa interaktywna: ciemne kafelki CARTO, złoty znacznik inwestycji z pulsującym pierścieniem,
 * pierścienie 1 km / 3 km oraz punkty w okolicy. Po lewej szklany panel z filtrami kategorii
 * i listą punktów — kliknięcie leci kamerą do punktu i otwiera jego dymek.
 */
export default function Map({ fields, id }: { fields: MapFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const center = unwrap(fields.center) ?? [50.0647, 19.945];
  const zoom = Number(unwrap(fields.zoom) ?? 12);
  const homeName = unwrap(fields.homeName) ?? "FOXHILLS";
  const categories = unwrap(fields.categories) ?? [];
  const points = unwrap(fields.points) ?? [];
  const listLabel = unwrap(fields.listLabel);

  const [visible, setVisible] = useState<Set<string>>(() => new Set(categories.map((category) => category.key)));
  const [focus, setFocus] = useState<number | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const point of points) map[point.category] = (map[point.category] ?? 0) + 1;
    return map;
  }, [points]);

  const toggle = (key: string) =>
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section id={id ?? "mapa"} className="relative scroll-mt-20 bg-[#26292B] pt-24 font-manrope sm:pt-32">
      <Container>
        <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} />
      </Container>

      <div className="relative mt-14 h-[780px] w-full border-y border-[#BCC0C1]/30 lg:h-[820px]">
        <MapView center={center as [number, number]} zoom={zoom} points={points} categories={categories} visible={visible} focus={focus} homeName={homeName} />

        {/* Panel nad mapą: filtry + lista punktów */}
        <aside className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] p-4 sm:p-6 lg:inset-y-0 lg:right-auto lg:flex lg:w-[400px] lg:items-center lg:p-10" aria-label="Punkty na mapie">
          <div className="pointer-events-auto flex max-h-[360px] w-full flex-col border border-[#BCC0C1]/40 bg-[#171A1C]/90 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.95)] backdrop-blur-xl lg:max-h-[640px]">
            <div className="flex flex-wrap gap-2 border-b border-[#BCC0C1]/25 p-4">
              {categories.map((category) => {
                const on = visible.has(category.key);
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => toggle(category.key)}
                    aria-pressed={on}
                    className={`flex items-center gap-2 border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.2em] transition-colors duration-300 ${
                      on ? "border-[#BCC0C1] bg-[#BCC0C1]/15 text-[#E7E7E7]" : "border-[#F7F7F7]/15 text-[#E7E7E7]/40 hover:text-[#E7E7E7]/70"
                    }`}
                  >
                    <Icon name={category.icon} className="h-3.5 w-3.5" />
                    {category.label}
                    <span className="text-[#E7E7E7]/40">{counts[category.key] ?? 0}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-5 pb-1 pt-4 text-[10px] font-medium uppercase tracking-[0.35em] text-[#BCC0C1]">{listLabel}</div>
            <ul className="overflow-y-auto px-2 pb-2">
              {points.map((point, index) => {
                if (!visible.has(point.category)) return null;
                const category = categories.find((item) => item.key === point.category);
                return (
                  <li key={`${point.name}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setFocus(index)}
                      className={`group flex w-full items-center gap-4 px-3 py-3 text-left transition-colors duration-300 ${focus === index ? "bg-[#BCC0C1]/15" : "hover:bg-[#BCC0C1]/[0.08]"}`}
                    >
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full border border-[#BCC0C1]/50 text-[#E7E7E7]">
                        <Icon name={category?.icon ?? "pin"} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-dmserif text-[15px] text-[#E7E7E7] transition-colors group-hover:text-[#E7E7E7]">{point.name}</span>
                        {point.desc && <span className="block truncate text-[11px] font-light text-[#E7E7E7]/50">{point.desc}</span>}
                      </span>
                      <Icon name="chevronRight" className="h-4 w-4 flex-none text-[#BCC0C1]/60 transition-transform group-hover:translate-x-1" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
