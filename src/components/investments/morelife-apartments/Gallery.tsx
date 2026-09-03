"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";

type GalleryImage = { path: string };

type GalleryFields = {
  eyebrow?: EditableValue<string> | string;
  headerPrefix?: EditableValue<string> | string;
  headerSuffix?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  gallery?: EditableValue<GalleryImage[]> | GalleryImage[];
};

export default function Gallery({ fields }: { fields: GalleryFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const headerPrefix = unwrap(fields.headerPrefix);
  const headerSuffix = unwrap(fields.headerSuffix);
  const text = unwrap(fields.text);
  const images = unwrap(fields.gallery) ?? [];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(() => images.length > 1);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setSelectedIndex(index);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => {
      if (prev === null || prev >= images.length - 1) return prev;
      const next = prev + 1;
      setCurrentIndex(next);
      return next;
    });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => {
      if (prev === null || prev <= 0) return prev;
      const next = prev - 1;
      setCurrentIndex(next);
      return next;
    });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <section id="galeria" className="bg-[#f6f5f2] text-[#1a1a1a] overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
        {eyebrow && <p className="uppercase tracking-[0.35em] text-[10px] sm:text-[11px] text-black/40">{eyebrow}</p>}

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extralight mt-5 leading-[1.1] font-serif">
          {headerPrefix} <span className="font-light">{headerSuffix}</span>
        </h2>

        <div className="w-16 sm:w-20 h-[1px] bg-[#7c8c65]/40 mt-6 sm:mt-8" />

        {text && <p className="mt-6 sm:mt-8 text-black/60 max-w-2xl leading-[1.7] sm:leading-[1.8] text-sm sm:text-base lg:text-lg">{text}</p>}
      </div>

      <div className="relative pb-16 sm:pb-20 lg:pb-24">
        <button
          onClick={scrollPrev}
          aria-label="Poprzednie zdjęcie"
          className={`hidden sm:block absolute left-3 top-1/2 -translate-y-1/2 z-30 text-black/30 text-4xl sm:text-5xl transition ${canScrollPrev ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          ‹
        </button>

        <button
          onClick={scrollNext}
          aria-label="Następne zdjęcie"
          className={`hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 z-30 text-black/30 text-4xl sm:text-5xl transition ${canScrollNext ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          ›
        </button>

        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {images.map((img, i) => (
              <div key={img.path} className="min-w-[85%] sm:min-w-[65%] lg:min-w-[60%] px-2 sm:px-4">
                <div onClick={() => handleImageClick(i)} className="relative aspect-[16/10] overflow-hidden cursor-pointer group">
                  <img loading="lazy" decoding="async" src={img.path} alt="" className="w-full h-full object-cover transition duration-[1200ms] group-hover:scale-[1.03]" />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                  <div className="absolute top-4 sm:top-5 left-4 sm:left-5 text-[10px] sm:text-[11px] tracking-[0.3em]">
                    <span className="text-[#7c8c65]">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
          <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] tracking-[0.3em] text-black/40">
            <div className="h-[1px] w-8 sm:w-10 bg-black/10" />
            <span>
              <span className="text-[#7c8c65]">{String(currentIndex + 1).padStart(2, "0")}</span>
              {" / "}
              {String(images.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4"
            onClick={() => setSelectedIndex(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Poprzednie zdjęcie"
              className="absolute left-3 sm:left-5 text-white text-3xl sm:text-4xl"
            >
              ‹
            </button>

            <motion.img
              src={selectedImage.path}
              alt=""
              className="w-full max-w-6xl max-h-[80vh] object-contain"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Następne zdjęcie"
              className="absolute right-3 sm:right-5 text-white text-3xl sm:text-4xl"
            >
              ›
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
