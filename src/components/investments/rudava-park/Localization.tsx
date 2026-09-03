"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import type { MapPoint } from "./LocalizationMap";

const LocalizationMap = dynamic(() => import("./LocalizationMap"), { ssr: false });

type LocFeature = { icon: string; textHeader: string; textSubHeader: string };

type LocalizationFields = {
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  features?: EditableValue<LocFeature[]> | LocFeature[];
  points?: EditableValue<MapPoint[]> | MapPoint[];
  center?: EditableValue<[number, number]> | [number, number];
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const features = unwrap(fields.features) ?? [];
  const points = unwrap(fields.points) ?? [];
  const center = unwrap(fields.center) ?? [50.07168, 19.858306];

  return (
    <section id="lokalizacja" className="bg-[#1D1D1D]">
      <Container>
        <div className="pb-[50px] md:pb-[100px]">
          <h2 className="font-ranade-variable text-[32px] md:text-[64px] mb-[24px] text-[#FCFCFC]">{header}</h2>
          {subHeader && <p className="font-ranade-variable font-thin text-[18px] md:text-[24px] text-[#FCFCFC]">{subHeader}</p>}
        </div>
      </Container>

      <div className="bg-[#1D1D1D] pb-[50px] md:pb-[100px]">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((item, i) => (
              <motion.div
                key={item.textHeader}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-[#212121] py-8 border border-[#212121] rounded-md text-center flex flex-col items-center justify-start"
              >
                <div className="w-[120px] h-[120px] mb-4 flex items-center justify-center">
                  <img loading="lazy" decoding="async" src={item.icon} alt="" className="max-w-1/2 max-h-full object-contain" />
                </div>
                <span className="font-ranade-variable font-normal text-[18px] md:text-[20px] text-white mb-2">{item.textHeader}</span>
                <span className="font-ranade-variable font-thin text-[18px] md:text-[14px] text-white">{item.textSubHeader}</span>
              </motion.div>
            ))}
          </div>
        </Container>
      </div>

      <div className="w-full h-[810px]">
        <LocalizationMap points={points} center={center} />
      </div>
    </section>
  );
}
