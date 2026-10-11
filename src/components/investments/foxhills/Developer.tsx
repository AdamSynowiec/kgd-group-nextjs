"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Button, Container, NUM, Reveal, SectionHeader } from "./ui";

type Stat = { value: string; label: string };

type DeveloperFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  stats?: EditableValue<Stat[]> | Stat[];
  image?: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
  buttonHref?: EditableValue<string> | string;
};

/**
 * "O deweloperze" — standard KGD w oprawie FOXHILLS: logotyp, opis, liczby portfolio i przejście na stronę KGD.
 * Ciemna sekcja z poświatą; po prawej wizytówka marki w złotej ramie.
 */
export default function Developer({ fields, id }: { fields: DeveloperFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const stats = unwrap(fields.stats) ?? [];
  const image = unwrap(fields.image);
  const buttonLabel = unwrap(fields.buttonLabel);
  const buttonHref = unwrap(fields.buttonHref) ?? "/";

  return (
    <section id={id ?? "deweloper"} className="relative scroll-mt-20 overflow-hidden bg-[#26292B] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-[#BCC0C1]/12 blur-[150px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#BCC0C1]/60 to-transparent" />

      <Container className="relative">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <Reveal>
              <img src="/investments/shared/kgd-group-logo.svg" alt="KGD — Krakowska Grupa Deweloperska" loading="lazy" decoding="async" className="mb-10 h-9 w-auto sm:h-11" />
            </Reveal>
            <SectionHeader eyebrow={eyebrow} title={header} accent={accent} />

            <div className="mt-9 space-y-6">
              {paragraphs.map((paragraph, index) => (
                <Reveal key={paragraph} delay={0.1 + index * 0.1}>
                  <p className="max-w-2xl text-[15px] font-light leading-[1.95] text-[#E7E7E7]/70">{paragraph}</p>
                </Reveal>
              ))}
            </div>

            {stats.length > 0 && (
              <div className="mt-12 grid max-w-2xl grid-cols-2 gap-px border border-[#BCC0C1]/25 bg-[#BCC0C1]/25 sm:grid-cols-4">
                {stats.map((stat, index) => (
                  <Reveal key={stat.label} delay={index * 0.08} y={20} className="bg-[#26292B]">
                    <div className="px-5 py-6">
                      <div className={`${NUM} whitespace-nowrap text-[30px] leading-none text-[#E7E7E7] sm:text-[34px]`}>{stat.value}</div>
                      <div className="mt-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[#E7E7E7]/55">{stat.label}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}

            {buttonLabel && (
              <Reveal delay={0.3} className="mt-12">
                <Button href={buttonHref} variant="outline">
                  {buttonLabel}
                </Button>
              </Reveal>
            )}
          </div>

          {image && (
            <Reveal className="lg:col-span-5" y={50}>
              <div className="relative">
                <div className="absolute -right-4 -top-4 h-full w-full border border-[#BCC0C1]/60" aria-hidden />
                <div className="relative overflow-hidden">
                  <img src={image} alt="Krakowska Grupa Deweloperska — KGD i KGD Building" loading="lazy" decoding="async" className="w-full object-cover" />
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </Container>
    </section>
  );
}
