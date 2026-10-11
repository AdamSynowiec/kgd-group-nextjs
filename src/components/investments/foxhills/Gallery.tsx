"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Button, Container, NUM, Reveal, SectionHeader } from "./ui";

type GalleryItem = { image: string; thumb?: string; category?: string; alt?: string; w?: number | string; h?: number | string };

type GalleryFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  allLabel?: EditableValue<string> | string;
  moreLabel?: EditableValue<string> | string;
  items?: EditableValue<GalleryItem[]> | GalleryItem[];
};

const PAGE_SIZE = 12;
const SWIPE = 60;

/**
 * Galeria wizualizacji: filtry kategorii, układ "murowany" (masonry) z płynnym najazdem i podpisami,
 * przycisk "pokaż więcej" oraz pełnoekranowy podgląd (klawisze ←/→/Esc, gest przesunięcia, pasek miniatur).
 * Siatka używa miniatur (900 px), podgląd — pełnych plików (2200 px), ładowanych dopiero po otwarciu.
 */
export default function Gallery({ fields, id }: { fields: GalleryFields; id?: string }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const allLabel = unwrap(fields.allLabel) ?? "Wszystkie";
  const moreLabel = unwrap(fields.moreLabel) ?? "Pokaż więcej";
  const items = unwrap(fields.items) ?? [];

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))), [items]);
  const [category, setCategory] = useState<string>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [direction, setDirection] = useState(1);
  const touchStart = useRef(0);

  const filtered = useMemo(() => (category === "all" ? items : items.filter((item) => item.category === category)), [items, category]);
  const shown = filtered.slice(0, visible);

  const go = useCallback(
    (step: number) => {
      setDirection(step);
      setLightbox((current) => (current === null ? current : (current + step + filtered.length) % filtered.length));
    },
    [filtered.length]
  );

  useEffect(() => {
    if (lightbox === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, go]);

  // Podgląd sąsiednich zdjęć w tle, żeby przewijanie było natychmiastowe.
  useEffect(() => {
    if (lightbox === null || filtered.length < 2) return;
    [1, -1].forEach((step) => {
      const neighbour = filtered[(lightbox + step + filtered.length) % filtered.length];
      if (neighbour) new Image().src = neighbour.image;
    });
  }, [lightbox, filtered]);

  const current = lightbox !== null ? filtered[lightbox] : null;

  return (
    <section id={id ?? "galeria"} className="relative scroll-mt-20 overflow-hidden bg-[#171A1C] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -left-40 top-40 h-[560px] w-[560px] rounded-full bg-[#BCC0C1]/10 blur-[160px]" />

      <Container className="relative">
        <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
          <SectionHeader eyebrow={eyebrow} title={header} accent={accent} text={text} />

          {categories.length > 0 && (
            <Reveal delay={0.15} className="flex flex-wrap gap-2" >
              {["all", ...categories].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setCategory(option);
                    setVisible(PAGE_SIZE);
                  }}
                  aria-pressed={category === option}
                  className={`border px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.28em] transition-colors duration-300 ${
                    category === option ? "border-[#BCC0C1] bg-[#BCC0C1] text-[#171A1C]" : "border-[#BCC0C1]/35 text-[#E7E7E7]/75 hover:border-[#E7E7E7] hover:text-[#E7E7E7]"
                  }`}
                >
                  {option === "all" ? allLabel : option}
                </button>
              ))}
            </Reveal>
          )}
        </div>

        <div className="mt-16 gap-4 sm:columns-2 lg:columns-3">
          {shown.map((item, index) => {
              const ratio = Number(item.w) > 0 && Number(item.h) > 0 ? `${item.w} / ${item.h}` : "16 / 9";
              return (
                <motion.button
                  key={`${category}-${item.image}`}
                  type="button"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: (index % 3) * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => {
                    setDirection(1);
                    setLightbox(index);
                  }}
                  aria-label={`Powiększ: ${item.alt ?? "zdjęcie"}`}
                  className="group relative mb-4 block w-full break-inside-avoid overflow-hidden bg-[#26292B] text-left"
                  style={{ aspectRatio: ratio }}
                >
                  <img src={item.thumb ?? item.image} alt={item.alt ?? ""} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.07]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C]/85 via-[#171A1C]/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="absolute inset-0 border border-[#BCC0C1]/0 transition-colors duration-500 group-hover:border-[#BCC0C1]/50" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    {item.category && <div className="text-[9px] uppercase tracking-[0.35em] text-[#BCC0C1]">{item.category}</div>}
                    {item.alt && <div className="mt-1.5 font-dmserif text-[17px] leading-snug text-[#E7E7E7]">{item.alt}</div>}
                  </div>
                  <span className="absolute right-4 top-4 grid h-10 w-10 place-items-center border border-[#E7E7E7]/60 bg-[#171A1C]/60 text-[#E7E7E7] opacity-0 backdrop-blur-sm transition-opacity duration-500 group-hover:opacity-100">
                    <Icon name="expand" className="h-4 w-4" />
                  </span>
                </motion.button>
              );
            })}
        </div>

        {visible < filtered.length && (
          <div className="mt-12 flex justify-center">
            <Button variant="outline" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
              {moreLabel} ({filtered.length - visible})
            </Button>
          </div>
        )}
      </Container>

      {/* Podgląd pełnoekranowy */}
      <AnimatePresence>
        {current && lightbox !== null && (
          <motion.div
            key="fh-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Podgląd zdjęcia"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[80] flex flex-col bg-[#050605]/97"
            onTouchStart={(event) => (touchStart.current = event.changedTouches[0].clientX)}
            onTouchEnd={(event) => {
              const diff = touchStart.current - event.changedTouches[0].clientX;
              if (diff > SWIPE) go(1);
              if (diff < -SWIPE) go(-1);
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 sm:px-10">
              <div className="font-manrope text-[11px] uppercase tracking-[0.35em] text-[#E7E7E7]/70">
                <span className={`${NUM} text-[22px] tracking-normal text-[#E7E7E7]`}>{String(lightbox + 1).padStart(2, "0")}</span> / {String(filtered.length).padStart(2, "0")}
                {current.category && <span className="ml-5 hidden text-[#BCC0C1] sm:inline">{current.category}</span>}
              </div>
              <button type="button" onClick={() => setLightbox(null)} aria-label="Zamknij podgląd" className="grid h-11 w-11 place-items-center border border-[#BCC0C1]/50 text-[#E7E7E7] transition-colors hover:bg-[#BCC0C1] hover:text-[#171A1C]">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20" onClick={() => setLightbox(null)}>
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.img
                  key={current.image}
                  src={current.image}
                  alt={current.alt ?? ""}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -60 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(event) => event.stopPropagation()}
                  className="max-h-full max-w-full select-none object-contain shadow-[0_40px_120px_-30px_rgba(0,0,0,1)]"
                  draggable={false}
                />
              </AnimatePresence>

              {filtered.length > 1 && (
                <>
                  <button type="button" onClick={(event) => { event.stopPropagation(); go(-1); }} aria-label="Poprzednie zdjęcie" className="absolute left-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 place-items-center border border-[#BCC0C1]/40 bg-[#171A1C]/60 text-[#E7E7E7] backdrop-blur-sm transition-colors hover:bg-[#BCC0C1] hover:text-[#171A1C] sm:grid">
                    <Icon name="chevronLeft" className="h-6 w-6" />
                  </button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); go(1); }} aria-label="Następne zdjęcie" className="absolute right-3 top-1/2 hidden h-14 w-14 -translate-y-1/2 place-items-center border border-[#BCC0C1]/40 bg-[#171A1C]/60 text-[#E7E7E7] backdrop-blur-sm transition-colors hover:bg-[#BCC0C1] hover:text-[#171A1C] sm:grid">
                    <Icon name="chevronRight" className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            <div className="px-5 pb-5 pt-4 sm:px-10">
              {current.alt && <p className="mb-4 text-center font-dmserif text-[22px] font-light italic text-[#E7E7E7]/85 sm:text-[26px]">{current.alt}</p>}
              <div className="mx-auto flex max-w-full gap-2 overflow-x-auto pb-1 sm:justify-center" role="tablist" aria-label="Miniatury">
                {filtered.map((item, index) => (
                  <button
                    key={item.image}
                    type="button"
                    role="tab"
                    aria-selected={index === lightbox}
                    aria-label={`Zdjęcie ${index + 1}`}
                    onClick={() => {
                      setDirection(index > lightbox ? 1 : -1);
                      setLightbox(index);
                    }}
                    className={`h-14 w-24 flex-none overflow-hidden border transition-all duration-300 ${index === lightbox ? "border-[#E7E7E7] opacity-100" : "border-transparent opacity-45 hover:opacity-90"}`}
                  >
                    <img src={item.thumb ?? item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
