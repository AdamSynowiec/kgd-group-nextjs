"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Container, NUM, Reveal, SectionHeader } from "./ui";

type Feature = { icon: string; title: string; text: string };

type FeaturesFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  bgImage?: EditableValue<string> | string;
  items?: EditableValue<Feature[]> | Feature[];
};

/**
 * "Udogodnienia" — graficzne przedstawienie najważniejszych atutów z sekcji "O inwestycji".
 * Ciemna sekcja z fotografią w tle (delikatny parallax) i siatką ośmiu kafli: złota ikona,
 * numer, tytuł Melodrama i opis. Kafle łączą się cienkimi liniami w jedną "tablicę".
 */
export default function Features({ fields, id }: { fields: FeaturesFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const bgImage = unwrap(fields.bgImage);
  const items = unwrap(fields.items) ?? [];

  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <section ref={ref} id={id ?? "udogodnienia"} className="relative isolate scroll-mt-20 overflow-hidden bg-[#26292B] py-24 font-manrope sm:py-32 lg:py-40">
      {bgImage && (
        <>
          <motion.img src={bgImage} alt="" loading="lazy" decoding="async" style={{ y }} className="absolute inset-x-0 -top-[8%] -z-10 h-[116%] w-full object-cover opacity-60" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#26292B] via-[#26292B]/55 to-[#26292B]" />
        </>
      )}

      <Container>
        <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} align="center" />

        <div className="mt-20 grid border-l border-t border-[#BCC0C1]/25 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal key={item.title} delay={(index % 4) * 0.08} y={30} className="h-full">
              <article className="group relative flex h-full flex-col border-b border-r border-[#BCC0C1]/25 bg-[#171A1C]/30 p-8 backdrop-blur-[2px] transition-colors duration-700 hover:bg-[#BCC0C1]/[0.07] sm:p-10">
                <div className="flex items-start justify-between">
                  <span className="text-[#BCC0C1] transition-transform duration-700 group-hover:-translate-y-1 group-hover:text-[#E7E7E7]">
                    <Icon name={item.icon} className="h-11 w-11" strokeWidth={0.9} />
                  </span>
                  <span className={`${NUM} text-[54px] leading-none text-[#E7E7E7]/[0.09] transition-colors duration-700 group-hover:text-[#BCC0C1]/40`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-10 font-dmserif text-[23px] font-medium leading-snug text-[#E7E7E7]">{item.title}</h3>
                <span className="mt-4 block h-px w-8 bg-[#BCC0C1] transition-all duration-700 group-hover:w-20" />
                <p className="mt-5 text-[14px] font-light leading-[1.9] text-[#E7E7E7]/60">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
