"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Container, Reveal, SectionHeader } from "./ui";

type InvestmentItem = { icon?: string; title: string; text?: string };

type InvestmentFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  image?: EditableValue<string> | string;
  imageAlt?: EditableValue<string> | string;
  items?: EditableValue<InvestmentItem[]> | InvestmentItem[];
};

/**
 * "Twój adres. Twoja inwestycja" — zakup w celach inwestycyjnych (katalog, str. 18–19): nagłówek i opis
 * obok dużej wizualizacji, pod spodem cztery filary współpracy z partnerem najmu (ikony + krótkie opisy).
 */
export default function Investment({ fields, id }: { fields: InvestmentFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const image = unwrap(fields.image);
  const imageAlt = unwrap(fields.imageAlt) ?? header ?? "";
  const items = unwrap(fields.items) ?? [];

  return (
    <section id={id ?? "inwestycja"} className="relative scroll-mt-20 overflow-hidden bg-[#171A1C] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -left-40 bottom-20 h-[520px] w-[520px] rounded-full bg-[#BCC0C1]/10 blur-[150px]" />

      <Container className="relative">
        <div className="grid items-center gap-14 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <div>
            <SectionHeader eyebrow={eyebrow} title={header} accent={accent} />
            {paragraphs.length > 0 && (
              <Reveal delay={0.1} className="mt-8 max-w-xl space-y-5">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-[15px] font-light leading-[1.9] text-[#E7E7E7]/70 sm:text-[16px]">
                    {paragraph}
                  </p>
                ))}
              </Reveal>
            )}
          </div>

          {image && (
            <Reveal delay={0.15} className="relative">
              <div className="pointer-events-none absolute -inset-3 border border-[#BCC0C1]/25 sm:-inset-5" />
              <div className="relative aspect-[3/2] overflow-hidden">
                <img src={image} alt={imageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </div>
            </Reveal>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-20 grid gap-y-12 border-t border-[#BCC0C1]/15 pt-14 sm:mt-28 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.08} className="h-full">
                <article className="group h-full px-0 sm:px-8 lg:border-l lg:border-[#BCC0C1]/20 lg:first:border-l-0 lg:first:pl-0">
                  {item.icon && <Icon name={item.icon} className="h-10 w-10 text-[#BCC0C1] transition-colors duration-500 group-hover:text-[#F7F7F7]" strokeWidth={1.1} />}
                  <h3 className="mt-6 whitespace-pre-line font-dmserif text-[20px] leading-snug text-[#F7F7F7] sm:text-[22px]">{item.title}</h3>
                  {item.text && <p className="mt-3 text-[14px] font-light leading-[1.8] text-[#E7E7E7]/60">{item.text}</p>}
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
