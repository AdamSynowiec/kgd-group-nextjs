"use client";

import dynamic from "next/dynamic";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import type { MapPoint } from "./LocalizationMap";

const LocalizationMap = dynamic(() => import("./LocalizationMap"), { ssr: false });

type LocalizationFields = {
  header?: EditableValue<string> | string;
  points?: EditableValue<MapPoint[]> | MapPoint[];
  center?: EditableValue<[number, number]> | [number, number];
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const header = unwrap(fields.header);
  const points = unwrap(fields.points) ?? [];
  const center = unwrap(fields.center) ?? [50.07496278272035, 19.8496566295146];

  return (
    <section id="lokalizacja" className="bg-[#1D1D1D]">
      <Container>
        <div className="pb-[50px] md:pb-[100px]">
          <h2 className="text-[#FCFCFC] text-[48px] font-ranade-variable">{header}</h2>
        </div>
      </Container>
      <div className="w-full h-[810px]">
        <LocalizationMap points={points} center={center} />
      </div>
    </section>
  );
}
