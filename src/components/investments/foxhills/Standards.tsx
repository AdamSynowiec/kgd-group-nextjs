"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Button, Container, NUM, Reveal, SectionHeader } from "./ui";

type Standard = {
  name: string;
  tagline?: string;
  text?: string;
  floors?: string;
  bathrooms?: string;
  kitchen?: string;
  joinery?: string;
  installations?: string;
  palette?: string;
  image?: string;
  pdfUrl?: string;
};

type StandardsFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  standards?: EditableValue<Standard[]> | Standard[];
  labels?: EditableValue<Record<string, string>> | Record<string, string>;
  downloadLabel?: EditableValue<string> | string;
  requestLabel?: EditableValue<string> | string;
  note?: EditableValue<string> | string;
};

const ROMAN = ["I", "II", "III", "IV", "V"];

const DEFAULT_LABELS: Record<string, string> = {
  floors: "Podłogi i ściany",
  bathrooms: "Łazienki",
  kitchen: "Kuchnia i garderoba",
  joinery: "Stolarka i drzwi",
  installations: "Instalacje i komfort",
  palette: "Paleta materiałów",
};

/** "Dąb naturalny:#B58B5A|Grafit:#2B2D2C" → próbki kolorów. */
function parsePalette(raw?: string): { name: string; color: string }[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((chunk) => {
      const [name, color] = chunk.split(":");
      return { name: (name ?? "").trim(), color: (color ?? "").trim() };
    })
    .filter((swatch) => swatch.name && /^#[0-9a-f]{3,8}$/i.test(swatch.color));
}

/**
 * "Standard wykończenia" — trzy pakiety (zakładki w układzie "karty wizytowe"): nazwa z numerem rzymskim,
 * opis, pięć obszarów wykończenia, paleta materiałów i przycisk pobrania zestawienia.
 */
export default function Standards({ fields, id }: { fields: StandardsFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const standards = unwrap(fields.standards) ?? [];
  const labels = { ...DEFAULT_LABELS, ...(unwrap(fields.labels) ?? {}) };
  const downloadLabel = unwrap(fields.downloadLabel);
  const requestLabel = unwrap(fields.requestLabel);
  const note = unwrap(fields.note);

  const [active, setActive] = useState(0);
  const current = standards[active];
  const areas: (keyof Standard)[] = ["floors", "bathrooms", "kitchen", "joinery", "installations"];

  return (
    <section id={id ?? "standard"} className="relative scroll-mt-20 overflow-hidden bg-[#F7F7F7] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -right-40 top-40 h-[560px] w-[560px] rounded-full bg-[#BCC0C1]/12 blur-[150px]" />

      <Container className="relative">
        <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} tone="light" />

        {/* Zakładki */}
        <Reveal delay={0.1} className="mt-16">
          <div role="tablist" aria-label="Standardy wykończenia" className="grid border border-[#171A1C]/15 sm:grid-cols-3">
            {standards.map((standard, index) => {
              const isActive = index === active;
              return (
                <button
                  key={standard.name}
                  type="button"
                  role="tab"
                  id={`fh-standard-tab-${index}`}
                  aria-selected={isActive}
                  aria-controls={`fh-standard-panel-${index}`}
                  onClick={() => setActive(index)}
                  className={`group relative flex items-center gap-5 px-6 py-6 text-left transition-colors duration-500 sm:px-8 sm:py-7 ${index > 0 ? "border-t border-[#171A1C]/15 sm:border-l sm:border-t-0" : ""} ${isActive ? "bg-[#171A1C]" : "hover:bg-[#171A1C]/[0.04]"}`}
                >
                  <span className={`font-dmserif text-[44px] font-medium leading-none transition-colors duration-500 ${isActive ? "text-[#BCC0C1]" : "text-[#171A1C]/25 group-hover:text-[#555859]"}`}>{ROMAN[index]}</span>
                  <span>
                    <span className={`block font-dmserif text-[22px] transition-colors duration-500 ${isActive ? "text-[#E7E7E7]" : "text-[#171A1C]"}`}>{standard.name}</span>
                    {standard.tagline && <span className={`mt-1 block text-[11px] font-light uppercase tracking-[0.25em] ${isActive ? "text-[#E7E7E7]/80" : "text-[#171A1C]/50"}`}>{standard.tagline}</span>}
                  </span>
                  <span className={`absolute inset-x-0 bottom-0 h-[3px] origin-left bg-gradient-to-r from-[#E7E7E7] to-[#BCC0C1] transition-transform duration-700 ${isActive ? "scale-x-100" : "scale-x-0"}`} />
                </button>
              );
            })}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.name}
              role="tabpanel"
              id={`fh-standard-panel-${active}`}
              aria-labelledby={`fh-standard-tab-${active}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16"
            >
              <div className="lg:col-span-5">
                <div className="relative">
                  <div className="absolute -bottom-4 -left-4 h-full w-full border border-[#BCC0C1]/60" aria-hidden />
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#171A1C]">
                    {current.image && <img src={current.image} alt={`Standard ${current.name} — detale wykończenia`} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C]/75 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-7">
                      <div className="font-dmserif text-[34px] font-light italic leading-none text-[#E7E7E7]">Standard</div>
                      <div className="mt-1 font-dmserif text-[44px] font-medium leading-none text-[#E7E7E7]">{current.name}</div>
                    </div>
                  </div>
                </div>

                {parsePalette(current.palette).length > 0 && (
                  <div className="mt-12">
                    <div className="text-[10px] font-medium uppercase tracking-[0.35em] text-[#555859]">{labels.palette}</div>
                    <ul className="mt-5 flex flex-wrap gap-5">
                      {parsePalette(current.palette).map((swatch) => (
                        <li key={swatch.name} className="flex items-center gap-3">
                          <span className="h-11 w-11 rounded-full border border-[#171A1C]/15 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25)]" style={{ background: swatch.color }} />
                          <span className="text-[12px] font-light text-[#171A1C]/70">{swatch.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7">
                {current.text && <p className="font-dmserif text-[26px] font-light italic leading-snug text-[#171A1C] sm:text-[32px]">{current.text}</p>}

                <dl className="mt-10 divide-y divide-[#171A1C]/12 border-y border-[#171A1C]/12">
                  {areas.map((area, index) =>
                    current[area] ? (
                      <div key={area} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
                        <dt className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.28em] text-[#555859]">
                          <span className={`${NUM} text-[20px] tracking-normal text-[#171A1C]/35`}>{String(index + 1).padStart(2, "0")}</span>
                          {labels[area as string]}
                        </dt>
                        <dd className="text-[14px] font-light leading-[1.9] text-[#171A1C]/75">{current[area]}</dd>
                      </div>
                    ) : null
                  )}
                </dl>

                <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  {current.pdfUrl ? (
                    <Button href={current.pdfUrl} variant="ghost-dark" external download>
                      <Icon name="download" className="h-4 w-4" />
                      {downloadLabel}
                    </Button>
                  ) : (
                    <Button href="#kontakt" variant="ghost-dark">
                      <Icon name="download" className="h-4 w-4" />
                      {requestLabel ?? downloadLabel}
                    </Button>
                  )}
                  {note && <p className="max-w-md text-[12px] font-light leading-relaxed text-[#171A1C]/50">{note}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </section>
  );
}
