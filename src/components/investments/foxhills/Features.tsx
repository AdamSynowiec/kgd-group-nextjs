"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Container, NUM, Reveal, SectionHeader } from "./ui";

type Feature = { title: string; text?: string; image?: string };

type FeaturesFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  items?: EditableValue<Feature[]> | Feature[];
  note?: EditableValue<string> | string;
};

/**
 * "Udogodnienia" — części wspólne osiedla: karty ze zdjęciami (restauracja, basen, jacuzzi i sauna, padel, siłownia,
 * symulatory...). Zdjęcie wypełnia kartę, tytuł i opis wjeżdżają po najechaniu (na telefonie widoczne od razu).
 */
export default function Features({ fields, id }: { fields: FeaturesFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const items = unwrap(fields.items) ?? [];
  const note = unwrap(fields.note);

  return (
    <section id={id ?? "udogodnienia"} className="relative scroll-mt-20 overflow-hidden bg-[#26292B] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-[#BCC0C1]/10 blur-[150px]" />

      <Container className="relative">
        <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} align="center" />

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal key={item.title} delay={(index % 4) * 0.08} y={30} className="h-full">
              <article className="group relative aspect-[4/5] overflow-hidden bg-[#171A1C]">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C] via-[#171A1C]/35 to-transparent transition-opacity duration-700 group-hover:from-[#171A1C]/95" />
                <div className="absolute inset-0 border border-[#E7E7E7]/0 transition-colors duration-700 group-hover:border-[#E7E7E7]/50" />

                <span className={`${NUM} absolute right-5 top-4 text-[44px] leading-none text-[#E7E7E7]/30 transition-colors duration-700 group-hover:text-[#E7E7E7]/70`}>{String(index + 1).padStart(2, "0")}</span>

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                  <span className="block h-px w-8 bg-[#BCC0C1] transition-all duration-700 group-hover:w-20" />
                  <h3 className="mt-4 font-dmserif text-[24px] leading-tight text-[#F7F7F7]">{item.title}</h3>
                  {item.text && (
                    <p className="mt-3 max-h-[8rem] text-[13px] font-light leading-[1.8] text-[#E7E7E7]/75 transition-all duration-700 lg:max-h-0 lg:translate-y-3 lg:opacity-0 lg:group-hover:max-h-[8rem] lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                      {item.text}
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        {note && <p className="mx-auto mt-10 max-w-3xl text-center text-[12px] font-light text-[#E7E7E7]/45">{note}</p>}
      </Container>
    </section>
  );
}
