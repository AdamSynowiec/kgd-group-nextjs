"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Feature = { icon: string; text: string };
type WhyItem = { icon: string; text: string };

type AboutUsFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  features?: EditableValue<Feature[]> | Feature[];
  slides?: EditableValue<string[]> | string[];
  whyEyebrow?: EditableValue<string> | string;
  whyHeader?: EditableValue<string> | string;
  whyItems?: EditableValue<WhyItem[]> | WhyItem[];
  bottomText?: EditableValue<string> | string;
};

const whyIcons: Record<string, string> = {
  home: "/investments/pylna-residence/icons/icon-home.svg",
  tree: "/investments/pylna-residence/icons/icon-tree.svg",
  wind: "/investments/pylna-residence/icons/icon-wind.svg",
  diamond: "/investments/pylna-residence/icons/icon-diamond.svg",
};

function Motion({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: false, amount: 0.3 }}>
      {children}
    </motion.div>
  );
}

export default function AboutUs({ fields }: { fields: AboutUsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const features = unwrap(fields.features) ?? [];
  const slides = unwrap(fields.slides) ?? [];
  const whyEyebrow = unwrap(fields.whyEyebrow);
  const whyHeader = unwrap(fields.whyHeader);
  const whyItems = unwrap(fields.whyItems) ?? [];
  const bottomText = unwrap(fields.bottomText);

  return (
    <section id="inwestycja" className="bg-[#1C1D21]">
      <div className="bg-[#1C1D21] py-[50px] md:py-[100px]">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {features.map((item) => (
              <Motion key={item.text}>
                <div className="transform-gpu bg-[#1C1D21] py-8 border border-[#1C1D21] rounded-md text-center flex flex-col items-center">
                  <div className="w-[120px] h-[120px] mb-4 flex items-center justify-center">
                    <img loading="lazy" decoding="async" src={item.icon} className="max-w-full max-h-full object-contain" alt="" />
                  </div>
                  <span className="font-ranade-variable text-[18px] md:text-[20px] text-white">{item.text}</span>
                </div>
              </Motion>
            ))}
          </div>
        </Container>
      </div>

      <Container>
        <div className="mb-[50px] md:pb-[100px]">
          <Motion>
            <span className="block text-[#FCFCFC] text-[18px] md:text-[24px] font-semibold">{eyebrow}</span>
            <h2 className="text-[#FCFCFC] text-[36px] md:text-[48px] font-ranade-variable">{header}</h2>
            <p className="text-[#FCFCFC] text-[18px] md:text-[24px] font-thin">{subHeader}</p>
          </Motion>
        </div>
      </Container>

      <div
        className="min-h-svh"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(28,29,33,1) 0%, rgba(0,0,0,0) 69%, rgba(28,29,33,1) 100%), url(/investments/pylna-residence/aboutus-slides-bg.webp)",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
        }}
      >
        <Container>
          {slides.map((txt) => (
            <div key={txt} className="min-h-svh flex items-center justify-center text-center">
              <Motion>
                <h2 className="text-[#FCFCFC] text-[32px] lg:text-[64px] md:text-[96px] font-melodrama">{txt}</h2>
              </Motion>
            </div>
          ))}
        </Container>
      </div>

      <Container>
        <div className="py-[50px] md:py-[100px]">
          <Motion>
            <span className="block text-[#FCFCFC] text-[18px] md:text-[24px] font-semibold">{whyEyebrow}</span>
            <h2 className="text-[#FCFCFC] text-[36px] md:text-[48px] font-ranade-variable">{whyHeader}</h2>
          </Motion>
        </div>
      </Container>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Motion>
          <img
            loading="lazy"
            decoding="async"
            src="/investments/pylna-residence/aboutus-bottom.webp"
            className="w-full h-full object-cover"
            alt=""
          />
        </Motion>

        <div className="p-[50px] grid gap-[24px]">
          <Motion>
            <p className="text-white text-[18px] md:text-[24px] font-thin">{bottomText}</p>
          </Motion>

          <div className="grid grid-cols-1 md:grid-cols-2">
            {whyItems.map((item, i) => (
              <Motion key={item.text}>
                <div
                  className={`aspect-square flex flex-col items-center justify-center border-[#353535] ${i === 0 ? "border-b-2 md:border-b-0 md:border-r-2" : ""} ${i === 1 ? "border-b-2 md:border-b-0" : ""} ${i === 2 ? "md:border-r-2 md:border-t-2" : ""} ${i === 3 ? "border-t-2" : ""}`}
                >
                  <div className="w-[120px] h-[120px] mb-4 flex items-center justify-center">
                    <img loading="lazy" decoding="async" src={whyIcons[item.icon]} className="max-w-full max-h-full object-contain" alt="" />
                  </div>
                  <span className="font-ranade-variable text-[18px] md:text-[20px] text-white text-center whitespace-pre-line">{item.text}</span>
                </div>
              </Motion>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
