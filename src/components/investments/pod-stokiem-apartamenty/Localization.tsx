"use client";

import dynamic from "next/dynamic";
import { unwrap, type EditableValue } from "@/lib/editable";
import Header from "./Header";
import type { MapPoint } from "./LocalizationMap";

const LocalizationMap = dynamic(() => import("./LocalizationMap"), { ssr: false });

type LocalizationFields = {
  header?: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  points?: EditableValue<MapPoint[]> | MapPoint[];
  center?: EditableValue<[number, number]> | [number, number];
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const points = unwrap(fields.points) ?? [];
  const center = unwrap(fields.center) ?? [50.07132617089252, 19.852251986941273];

  return (
    <section id="lokalizacja" className="bg-[#1D1D1D]">
      <Header heading={header} subHeading={subHeader} />
      <div className="w-full h-[810px]">
        <LocalizationMap points={points} center={center} />
      </div>
    </section>
  );
}
