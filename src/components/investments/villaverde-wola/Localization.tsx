"use client";

import dynamic from "next/dynamic";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import type { MapPoint } from "./LocalizationMap";

const LocalizationMap = dynamic(() => import("./LocalizationMap"), { ssr: false });

type LocFeature = { icon: string; text: string };

type LocalizationFields = {
  header?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  features?: EditableValue<LocFeature[]> | LocFeature[];
  points?: EditableValue<MapPoint[]> | MapPoint[];
  center?: EditableValue<[number, number]> | [number, number];
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const features = unwrap(fields.features) ?? [];
  const points = unwrap(fields.points) ?? [];
  const center = unwrap(fields.center) ?? [50.074642489694, 19.854983503226396];

  return (
    <div className="bg-white">
      <div id="Lokalizacja" />
      <div className="py-[50px] lg:py-[100px]">
        <Container>
          <h2 className="text-[#474747] font-ebgaramond-regular text-[64px] mb-[40px] text-center">{header}</h2>
          <p className="font-ebgaramond-regular text-[#474747] text-[26px] text-center max-w-[1200px] mx-auto">{text}</p>
        </Container>
      </div>
      <div className="bg-[#FCFCFC] py-[50px] lg:py-[100px]">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-4 px-[32px]">
            {features.map((item) => (
              <div className="flex items-center flex-col gap-[40px] lg:px-[32px] pb-[32px] lg:pb-0" key={item.text}>
                <img loading="lazy" decoding="async" src={item.icon} alt="" />
                <p className="font-ebgaramond-regular text-[#474747] text-[26px] text-center whitespace-pre-line">{item.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>
      <div className="bg-slate-500 min-h-svh">
        <div className="w-full h-screen">
          <LocalizationMap points={points} center={center} />
        </div>
      </div>
    </div>
  );
}
