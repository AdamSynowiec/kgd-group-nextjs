"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { PillarIcon } from "./PillarIcons";
import { Container, NUM, Reveal, SectionHeader } from "./ui";

type Stat = { value: string; label: string };
type Pillar = { icon: string; title: string; text: string };

type AboutUsFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  quote?: EditableValue<string> | string;
  imageMain?: EditableValue<string> | string;
  imageSecondary?: EditableValue<string> | string;
  stats?: EditableValue<Stat[]> | Stat[];
  pillars?: EditableValue<Pillar[]> | Pillar[];
};

/** Liczba, która "dolicza się" do wartości, gdy wjedzie w ekran. Wartości nienumeryczne ("A–F") wyświetlane bez zmian. */
function CountUp({ value }: { value: string }) {
  const match = value.match(/^(\D*)(\d[\d\s]*)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const target = match ? parseInt(match[2].replace(/\s/g, ""), 10) : 0;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!match || !inView) return;
    const controls = animate(0, target, { duration: 1.8, ease: [0.22, 1, 0.36, 1], onUpdate: (latest) => setShown(Math.round(latest)) });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, target]);

  if (!match) return <span ref={ref}>{value}</span>;

  const formatted = (inView ? shown : 0).toLocaleString("pl-PL").replace(/ /g, " ");
  return (
    <span ref={ref}>
      {match[1]}
      {formatted}
      {match[3]}
    </span>
  );
}

/**
 * "O inwestycji": jasna, magazynowa sekcja — tekst opisowy i cytat po lewej, kompozycja dwóch zdjęć
 * w złotej ramie po prawej, pas liczb oraz cztery filary (budynki, lokalizacja, udogodnienia, cechy).
 */
export default function AboutUs({ fields, id }: { fields: AboutUsFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const quote = unwrap(fields.quote);
  const imageMain = unwrap(fields.imageMain);
  const imageSecondary = unwrap(fields.imageSecondary);
  const stats = unwrap(fields.stats) ?? [];
  const pillars = unwrap(fields.pillars) ?? [];

  return (
    <section id={id ?? "o_inwestycji"} className="relative scroll-mt-20 overflow-hidden bg-[#F7F7F7] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-[#BCC0C1]/10 blur-[140px]" />

      <Container className="relative">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow={eyebrow} title={header} accent={accent} tone="light" />

            <div className="mt-10 space-y-6">
              {paragraphs.map((paragraph, index) => (
                <Reveal key={paragraph} delay={0.1 + index * 0.1}>
                  <p className={`font-light leading-[1.95] text-[#171A1C]/70 ${index === 0 ? "text-[18px] leading-[2] text-[#171A1C]/85" : "text-[15px]"}`}>
                    {paragraph}
                  </p>
                </Reveal>
              ))}
            </div>

            {quote && (
              <Reveal delay={0.3} className="mt-12 border-l border-[#BCC0C1] pl-7">
                <p className="font-dmserif text-[26px] font-light italic leading-snug text-[#171A1C] sm:text-[30px]">„{quote}”</p>
              </Reveal>
            )}
          </div>

          <Reveal className="relative lg:col-span-7" y={50}>
            <div className="relative ml-auto w-[88%]">
              {/* Złota rama przesunięta względem zdjęcia */}
              <div className="absolute -right-5 -top-5 h-full w-full border border-[#BCC0C1]/60" aria-hidden />
              {imageMain && (
                <div className="relative aspect-[4/5] overflow-hidden bg-[#171A1C]">
                  <img src={imageMain} alt="Rezydencja FOXHILLS w otoczeniu sosen i pola golfowego" loading="lazy" decoding="async" className="h-full w-full object-cover object-[62%_50%] transition-transform duration-[2500ms] hover:scale-105" />
                </div>
              )}
            </div>
            {imageSecondary && (
              <div className="absolute -bottom-10 left-0 aspect-[4/3] w-[52%] overflow-hidden border-[10px] border-[#F7F7F7] bg-[#171A1C] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
                <img src={imageSecondary} alt="Taras z jacuzzi i widok na pole golfowe" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[2500ms] hover:scale-105" />
              </div>
            )}
          </Reveal>
        </div>

        {/* Pas liczb */}
        {stats.length > 0 && (
          <div className="mt-32 grid grid-cols-2 border-y border-[#171A1C]/15 sm:mt-40 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <Reveal key={stat.label} delay={index * 0.08} className={`px-4 py-10 text-center sm:py-14 ${index > 0 ? "lg:border-l lg:border-[#171A1C]/15" : ""} ${index % 2 === 1 ? "border-l border-[#171A1C]/15 lg:border-l" : ""} ${index >= 2 ? "border-t border-[#171A1C]/15 lg:border-t-0" : ""}`}>
                <div className={`${NUM} text-[56px] leading-none text-[#555859] sm:text-[76px]`}>
                  <CountUp value={stat.value} />
                </div>
                <div className="mt-4 font-manrope text-[10px] font-medium uppercase tracking-[0.35em] text-[#171A1C]/60 sm:text-[11px]">{stat.label}</div>
              </Reveal>
            ))}
          </div>
        )}

        {/* Cztery filary: budynki, lokalizacja, udogodnienia, najważniejsze cechy */}
        {pillars.length > 0 && (
          <div className="mt-20 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((pillar, index) => (
              <Reveal key={pillar.title} delay={index * 0.1}>
                <div className="group">
                  <div className="flex items-end justify-between">
                    <span className="grid h-[120px] w-[120px] place-items-center border border-[#BCC0C1]/60 text-[#26292B] transition-all duration-500 group-hover:bg-[#171A1C] group-hover:text-[#E7E7E7] sm:h-[144px] sm:w-[144px]">
                      <PillarIcon name={pillar.icon} className="h-[64px] w-[64px] sm:h-[76px] sm:w-[76px]" />
                    </span>
                    <span className="font-manrope text-[11px] tracking-[0.35em] text-[#555859]">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-6 font-dmserif text-[24px] font-medium text-[#171A1C]">{pillar.title}</h3>
                  <span className="mt-4 block h-px w-10 bg-[#BCC0C1] transition-all duration-500 group-hover:w-24" />
                  <p className="mt-5 text-[14px] font-light leading-[1.9] text-[#171A1C]/65">{pillar.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
