"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Container, Reveal, SectionHeader } from "./ui";

type StandardItem = { icon?: string; title: string; text?: string };

type BuildStandardFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  image?: EditableValue<string> | string;
  imageAlt?: EditableValue<string> | string;
  items?: EditableValue<StandardItem[]> | StandardItem[];
};

/**
 * "Standard" — standard budynków (katalog, str. 16): nagłówek z opisem, szeroka wizualizacja detalu
 * i sześć cech technicznych (ogrzewanie, klimatyzacja, smart home, instalacje, garaże, części wspólne)
 * w siatce z cienkimi pionowymi separatorami jak w katalogu. Pakiety wykończenia są osobno — sekcja Standards.
 */
export default function BuildStandard({ fields, id }: { fields: BuildStandardFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const image = unwrap(fields.image);
  const imageAlt = unwrap(fields.imageAlt) ?? header ?? "";
  const items = unwrap(fields.items) ?? [];

  return (
    <section id={id ?? "standard-budynkow"} className="relative scroll-mt-20 overflow-hidden bg-[#26292B] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-[#BCC0C1]/10 blur-[150px]" />

      <Container className="relative">
        <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} />

        {image && (
          <Reveal className="mt-16 sm:mt-20">
            <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[21/9]">
              <img src={image} alt={imageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#26292B]/60 via-transparent to-transparent" />
            </div>
          </Reveal>
        )}

        {items.length > 0 && (
          <div className="mt-16 grid gap-x-12 gap-y-12 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
            {items.map((item, index) => (
              <Reveal key={item.title} delay={(index % 3) * 0.08} className="h-full">
                <article className="group flex h-full gap-5 border-l border-[#BCC0C1]/25 pl-6 transition-colors duration-500 hover:border-[#E7E7E7]/70">
                  {item.icon && <Icon name={item.icon} className="h-9 w-9 shrink-0 text-[#BCC0C1] transition-colors duration-500 group-hover:text-[#F7F7F7]" strokeWidth={1.1} />}
                  <div>
                    <h3 className="whitespace-pre-line font-dmserif text-[22px] leading-tight text-[#F7F7F7] sm:text-[24px]">{item.title}</h3>
                    {item.text && <p className="mt-3 text-[14px] font-light leading-[1.8] text-[#E7E7E7]/65">{item.text}</p>}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
