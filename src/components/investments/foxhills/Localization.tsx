"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Container, NUM, Reveal, SectionHeader } from "./ui";

type Distance = { icon: string; name: string; time: string; distance?: string; mode?: string };

type LocalizationFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  image?: EditableValue<string> | string;
  imageCaption?: EditableValue<string> | string;
  distancesHeader?: EditableValue<string> | string;
  distances?: EditableValue<Distance[]> | Distance[];
  note?: EditableValue<string> | string;
};

/**
 * "Lokalizacja": opis otoczenia (tekst + zdjęcie z podpisem) oraz graficzna prezentacja odległości —
 * kafle z ikoną kategorii, czasem dojazdu i dystansem.
 */
export default function Localization({ fields, id }: { fields: LocalizationFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const image = unwrap(fields.image);
  const imageCaption = unwrap(fields.imageCaption);
  const distancesHeader = unwrap(fields.distancesHeader);
  const distances = unwrap(fields.distances) ?? [];
  const note = unwrap(fields.note);

  return (
    <section id={id ?? "lokalizacja"} className="relative scroll-mt-20 overflow-hidden bg-[#F7F7F7] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-[#BCC0C1]/12 blur-[150px]" />

      <Container className="relative">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-20">
          <Reveal className="relative order-2 lg:order-1 lg:col-span-6" y={50}>
            {image && (
              <div className="relative">
                <div className="absolute -bottom-5 -left-5 h-full w-full border border-[#BCC0C1]/60" aria-hidden />
                <div className="relative aspect-[4/3] overflow-hidden bg-[#171A1C]">
                  <img src={image} alt="Rezydencja nad polem golfowym i jeziorem" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[2500ms] hover:scale-105" />
                  {imageCaption && (
                    <div className="absolute bottom-0 left-0 bg-[#171A1C]/85 px-6 py-4 backdrop-blur-sm">
                      <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-[#E7E7E7]">
                        <Icon name="pin" className="h-4 w-4" />
                        {imageCaption}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Reveal>

          <div className="order-1 lg:order-2 lg:col-span-6">
            <SectionHeader eyebrow={eyebrow} title={header} accent={accent} tone="light" />
            <div className="mt-10 space-y-6">
              {paragraphs.map((paragraph, index) => (
                <Reveal key={paragraph} delay={0.1 + index * 0.1}>
                  <p className="text-[15px] font-light leading-[1.95] text-[#171A1C]/70">{paragraph}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        {distances.length > 0 && (
          <div className="mt-28 sm:mt-36">
            <Reveal className="flex items-center gap-6">
              <h3 className="font-dmserif text-[28px] font-medium text-[#171A1C] sm:text-[36px]">{distancesHeader}</h3>
              <span className="h-px flex-1 bg-gradient-to-r from-[#BCC0C1] to-transparent" />
            </Reveal>

            <ul className="mt-12 grid border-l border-t border-[#171A1C]/15 sm:grid-cols-2 lg:grid-cols-4">
              {distances.map((item, index) => (
                <Reveal key={item.name} delay={(index % 4) * 0.07} y={24} className="h-full">
                  <li className="group relative flex h-full list-none flex-col border-b border-r border-[#171A1C]/15 p-7 transition-colors duration-500 hover:bg-[#171A1C] sm:p-8">
                    <div className="flex items-start justify-between">
                      <span className="grid h-12 w-12 place-items-center rounded-full border border-[#BCC0C1]/60 text-[#555859] transition-colors duration-500 group-hover:border-[#BCC0C1] group-hover:text-[#E7E7E7]">
                        <Icon name={item.icon} className="h-5 w-5" />
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#171A1C]/45 transition-colors duration-500 group-hover:text-[#E7E7E7]/55">{item.mode}</span>
                    </div>
                    <div className={`mt-8 ${NUM} text-[56px] leading-none text-[#171A1C] transition-colors duration-500 group-hover:text-[#E7E7E7]`}>{item.time}</div>
                    <div className="mt-4 text-[14px] font-light leading-snug text-[#171A1C]/80 transition-colors duration-500 group-hover:text-[#E7E7E7]">{item.name}</div>
                    {item.distance && <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-[#555859]">{item.distance}</div>}
                  </li>
                </Reveal>
              ))}
            </ul>

            {note && <p className="mt-6 text-[12px] font-light text-[#171A1C]/50">{note}</p>}
          </div>
        )}
      </Container>
    </section>
  );
}
