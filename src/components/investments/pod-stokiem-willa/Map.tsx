"use client";

import dynamic from "next/dynamic";
import { unwrap, type EditableValue } from "@/lib/editable";
import type { MapPoint } from "./MapView";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type MapFields = {
  points?: EditableValue<MapPoint[]> | MapPoint[];
  center?: EditableValue<[number, number]> | [number, number];
};

export default function Map({ fields }: { fields: MapFields }) {
  const points = unwrap(fields.points) ?? [];
  const center = unwrap(fields.center) ?? [50.07115, 19.852256];

  return (
    <section id="lokalizacja" className="bg-[#1D1D1D]">
      <div className="w-full h-[810px]">
        <MapView points={points} center={center} />
      </div>
    </section>
  );
}
