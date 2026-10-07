"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type FeatureImageFields = {
  images?: EditableValue<string[]> | string[];
  eyebrow?: EditableValue<string> | string;
  title: EditableValue<string> | string;
  subtitle?: EditableValue<string> | string;
};

// TODO: tymczasowe zdjęcia z innych inwestycji — podmienić na realne realizacje "pod klucz" (pole "images" w adminie).
const PLACEHOLDER_IMAGES = [
  "/home/images/image00014.webp",
  "/home/images/Pylna_Dom_3_a.webp",
  "/home/images/image00018-min.webp",
  "/home/images/image00007.webp",
];

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 50;

/**
 * Slider pełnoszerokościowy przesuwany w poziomie (prawo → lewo): strzałki,
 * swipe na dotyku, autoplay (wstrzymany, gdy sekcja jest poza ekranem). Nie przechwytuje
 * scrolla strony, więc liczba zdjęć nie wpływa na długość/płynność przewijania.
 */
export default function FeatureImage({ fields }: { fields: FeatureImageFields }) {
  const fieldImages = unwrap(fields.images) ?? [];
  const images = fieldImages.length > 0 ? fieldImages : PLACEHOLDER_IMAGES;
  const eyebrow = unwrap(fields.eyebrow);
  const title = unwrap(fields.title);
  const subtitle = unwrap(fields.subtitle);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef(0);
  const count = images.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), { threshold: 0.3 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const go = useCallback((index: number) => setActive((index + count) % count), [count]);
  const next = useCallback(() => setActive((prev) => (prev + 1) % count), [count]);
  const prev = useCallback(() => setActive((prev) => (prev - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [active, paused, count, next]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[70svh] md:h-[88svh] overflow-hidden font-poppins bg-[#141414] select-none"
      onTouchStart={(e) => (touchStartX.current = e.changedTouches[0].clientX)}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (diff > SWIPE_THRESHOLD) next();
        if (diff < -SWIPE_THRESHOLD) prev();
      }}
    >
      <div className="flex h-full transition-transform duration-[900ms] ease-[cubic-bezier(0.77,0,0.18,1)]" style={{ transform: `translateX(-${active * 100}%)` }}>
        {images.map((src, index) => (
          <div key={src} className="relative h-full w-full flex-none overflow-hidden">
            <img
              src={src}
              alt=""
              draggable={false}
              loading={index === 0 ? "eager" : "lazy"}
              className={`h-full w-full object-cover transition-transform duration-[6000ms] ease-out ${index === active ? "scale-105" : "scale-100"}`}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

      <Container className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-12 md:pb-16 text-white">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            {eyebrow && (
              <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B]" />
                {eyebrow}
              </span>
            )}
            <h2 className="mt-4 font-ranade-variable font-light text-[32px] md:text-[56px] leading-[1.05] max-w-2xl">{title}</h2>
            {subtitle && <p className="mt-4 max-w-xl text-white/75 font-light leading-relaxed">{subtitle}</p>}
          </div>

          {count > 1 && (
            <div className="pointer-events-auto flex items-center gap-6 flex-none">
              <span className="font-ranade-variable text-[15px] tracking-[0.2em] text-white/80 tabular-nums">
                {String(active + 1).padStart(2, "0")} <span className="text-white/35">/ {String(count).padStart(2, "0")}</span>
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Poprzednie zdjęcie"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/25 text-white transition-colors duration-300 hover:border-[#C9AB8B] hover:bg-[#C9AB8B] cursor-pointer"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Następne zdjęcie"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/25 text-white transition-colors duration-300 hover:border-[#C9AB8B] hover:bg-[#C9AB8B] cursor-pointer"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>

        {count > 1 && (
          <div className="pointer-events-auto mt-8 flex gap-2">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => go(index)}
                aria-label={`Przejdź do zdjęcia ${index + 1}`}
                className="group h-6 flex-1 max-w-16 cursor-pointer"
              >
                <span className="relative block h-px w-full overflow-hidden bg-white/25">
                  <span
                    className={`absolute inset-0 origin-left bg-[#C9AB8B] ${
                      index === active ? (paused ? "scale-x-100" : "animate-[kgdProgress_6s_linear_forwards]") : index < active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
