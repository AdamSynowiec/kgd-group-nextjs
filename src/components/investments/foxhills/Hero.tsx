"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Button, Container, Logo } from "./ui";

type Slide = { image: string; alt?: string };
type Fact = { icon: string; label: string; value: string };

type HeroFields = {
  slides?: EditableValue<Slide[]> | Slide[];
  eyebrow?: EditableValue<string> | string;
  title?: EditableValue<string> | string;
  subtitle?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  primaryLabel?: EditableValue<string> | string;
  primaryHref?: EditableValue<string> | string;
  secondaryLabel?: EditableValue<string> | string;
  secondaryHref?: EditableValue<string> | string;
  facts?: EditableValue<Fact[]> | Fact[];
};

const SLIDE_MS = 7500;

/**
 * Hero FOXHILLS: pełnoekranowa pokazowa galeria wizualizacji (płynne przenikanie + powolny najazd kamery),
 * nazwa inwestycji w złotym gradiencie, dwa przyciski CTA i szklany pas z kluczowymi faktami.
 * Pierwsze zdjęcie ładowane z najwyższym priorytetem (LCP), kolejne dopiero gdy są potrzebne.
 */
export default function Hero({ fields }: { fields: HeroFields }) {
  const slides = unwrap(fields.slides) ?? [];
  const eyebrow = unwrap(fields.eyebrow);
  const title = unwrap(fields.title) ?? "FOXHILLS";
  const subtitle = unwrap(fields.subtitle);
  const text = unwrap(fields.text);
  const primaryLabel = unwrap(fields.primaryLabel);
  const primaryHref = unwrap(fields.primaryHref) ?? "#apartamenty";
  const secondaryLabel = unwrap(fields.secondaryLabel);
  const secondaryHref = unwrap(fields.secondaryHref) ?? "#kontakt";
  const facts = unwrap(fields.facts) ?? [];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % slides.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section id="top" className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-[#171A1C]">
      {/* Tło: wszystkie slajdy zamontowane po pierwszym, aktywny wjeżdża na wierzch */}
      <div className="absolute inset-0 -z-10">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          // Pierwszy slajd od razu, pozostałe dopiero gdy są aktywne lub następne w kolejce.
          const near = slideIndex === index || slideIndex === (index + 1) % slides.length || slideIndex === 0;
          if (!near) return null;
          return (
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.alt ?? ""}
              fetchPriority={slideIndex === 0 ? "high" : "auto"}
              loading={slideIndex === 0 ? "eager" : "lazy"}
              decoding="async"
              className={`fh-motion absolute inset-0 h-full w-full object-cover transition-opacity duration-[1800ms] ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`}
              style={isActive ? { animation: `fhKenBurns ${SLIDE_MS + 1800}ms ease-out forwards` } : undefined}
            />
          );
        })}
        {/* Warstwy kontrastu: dół pod tekst, góra pod nawigację, winieta */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C] via-[#171A1C]/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#171A1C]/60 via-[#171A1C]/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 to-transparent" />
      </div>

      <Container className="relative pb-10 pt-40 sm:pb-14 lg:pt-52">
        <div className="max-w-5xl">
          {eyebrow && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.2 }} className="flex items-center gap-4">
              <span className="h-px w-12 bg-[#BCC0C1]" />
              <span className="font-manrope text-[11px] font-medium uppercase tracking-[0.45em] text-[#E7E7E7] sm:text-[12px]">{eyebrow}</span>
            </motion.div>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.3, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8"
          >
            <span className="sr-only">{title}</span>
            <Logo variant="metal" label={title} className="w-[min(86vw,760px)] drop-shadow-[0_10px_40px_rgba(0,0,0,0.55)]" />
          </motion.h1>

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.7 }}
              className="mt-4 font-dmserif text-[26px] font-light italic leading-tight text-[#E7E7E7] sm:text-[36px] lg:text-[44px]"
            >
              {subtitle}
            </motion.p>
          )}

          {text && (
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.9 }}
              className="mt-7 max-w-xl font-manrope text-[14px] font-light leading-[1.9] text-[#E7E7E7]/75 sm:text-[16px]"
            >
              {text}
            </motion.p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 1.1 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            {primaryLabel && (
              <Button href={primaryHref} variant="gold">
                {primaryLabel}
                <Icon name="arrow" className="h-4 w-4" />
              </Button>
            )}
            {secondaryLabel && (
              <Button href={secondaryHref} variant="outline">
                {secondaryLabel}
              </Button>
            )}
          </motion.div>
        </div>

        {/* Szklany pas faktów */}
        {facts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 1.35 }}
            className="mt-14 grid grid-cols-2 border border-[#BCC0C1]/25 bg-[#171A1C]/55 backdrop-blur-md lg:mt-20 lg:grid-cols-4"
          >
            {facts.map((fact, factIndex) => (
              <div
                key={fact.label}
                className={`flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6 ${factIndex % 2 === 1 ? "border-l border-[#BCC0C1]/20" : ""} ${factIndex > 0 ? "lg:border-l lg:border-[#BCC0C1]/20" : ""} ${factIndex >= 2 ? "border-t border-[#BCC0C1]/20 lg:border-t-0" : ""}`}
              >
                <Icon name={fact.icon} className="h-7 w-7 flex-none text-[#BCC0C1]" strokeWidth={1} />
                <div>
                  <div className="font-manrope text-[10px] font-light uppercase tracking-[0.3em] text-[#E7E7E7]/55">{fact.label}</div>
                  <div className="mt-1 font-dmserif text-[17px] text-[#E7E7E7] sm:text-[19px]">{fact.value}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </Container>

      {/* Wskaźnik slajdów (prawa krawędź, tylko desktop) */}
      {slides.length > 1 && (
        <div className="absolute right-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex" role="tablist" aria-label="Zdjęcia inwestycji">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.image}
              type="button"
              role="tab"
              aria-selected={slideIndex === index}
              aria-label={`Zdjęcie ${slideIndex + 1}`}
              onClick={() => setIndex(slideIndex)}
              className="group flex items-center gap-3"
            >
              <span className={`font-manrope text-[10px] tracking-[0.25em] transition-opacity duration-500 ${slideIndex === index ? "text-[#E7E7E7] opacity-100" : "opacity-0 group-hover:opacity-70 text-[#E7E7E7]"}`}>
                {String(slideIndex + 1).padStart(2, "0")}
              </span>
              <span className={`block w-px transition-all duration-700 ${slideIndex === index ? "h-14 bg-[#BCC0C1]" : "h-6 bg-[#F7F7F7]/40 group-hover:bg-[#F7F7F7]"}`} />
            </button>
          ))}
        </div>
      )}

    </section>
  );
}
