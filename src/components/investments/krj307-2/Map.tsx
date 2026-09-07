"use client";

import dynamic from "next/dynamic";
import { unwrap, type EditableValue } from "@/lib/editable";
import type { MapPoint } from "./LocalizationMap";

const LocalizationMap = dynamic(() => import("./LocalizationMap"), { ssr: false });

type MapFields = {
  points?: EditableValue<MapPoint[]> | MapPoint[];
  center?: EditableValue<[number, number]> | [number, number];
};

/**
 * Osobna sekcja od Localization.tsx (dokładnie jak w oryginale — Localization.jsx
 * renderuje tekst, Map.jsx osobno mapę Leaflet). Bez powtórzonego id="lokalizacja"
 * (w źródle obie sekcje miały ten sam id — duplikat DOM-owy; kotwica zostaje na
 * pierwszym wystąpieniu, w Localization, bo ta sekcja jest wcześniej w kolejności).
 */
export default function Map({ fields }: { fields: MapFields }) {
  const points = unwrap(fields.points) ?? [];
  const center = unwrap(fields.center) ?? [50.07208138080224, 19.860517144927893];

  return (
    <section className="bg-[#1D1D1D]">
      <div className="w-full h-[810px]">
        <LocalizationMap points={points} center={center} />
      </div>
    </section>
  );
}
