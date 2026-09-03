"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Header from "./Header";

type GalleryImage = { path: string; altText?: string };

type GalleryFields = {
  header?: EditableValue<string> | string;
  gallery?: EditableValue<GalleryImage[]> | GalleryImage[];
};

export default function Gallery({ fields }: { fields: GalleryFields }) {
  const header = unwrap(fields.header);
  const images = unwrap(fields.gallery) ?? [];

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center", dragFree: false });

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

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div id="wizualizacje" className="bg-[#1A1D23] text-white overflow-hidden">
      <Header heading={header} />

      <div className="mx-auto px-4 pb-20">
        <div className="relative">
          <div
            className={`pointer-events-none absolute left-0 top-0 z-20 h-full w-24 bg-gradient-to-r from-[#1A1D23] via-[#1A1D23]/80 to-transparent transition-opacity duration-300 ${canScrollPrev ? "opacity-100" : "opacity-0"}`}
          />
          <div
            className={`pointer-events-none absolute right-0 top-0 z-20 h-full w-24 bg-gradient-to-l from-[#1A1D23] via-[#1A1D23]/80 to-transparent transition-opacity duration-300 ${canScrollNext ? "opacity-100" : "opacity-0"}`}
          />

          <button
            onClick={scrollPrev}
            aria-label="Poprzednie zdjęcie"
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 h-12 w-12 flex items-center justify-center rounded-full backdrop-blur-xl bg-white/10 border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-105 ${canScrollPrev ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={scrollNext}
            aria-label="Następne zdjęcie"
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 h-12 w-12 flex items-center justify-center rounded-full backdrop-blur-xl bg-white/10 border border-white/10 transition-all duration-300 hover:bg-white/20 hover:scale-105 ${canScrollNext ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {images.map((img, index) => (
                <div key={img.path} className="min-w-[88%] md:min-w-[70%] lg:min-w-[58%] xl:min-w-[52%] pl-3 pr-3">
                  <div
                    onClick={() => handleImageClick(index)}
                    className="group relative aspect-[16/10] overflow-hidden cursor-pointer rounded-[28px] bg-black/20 border border-white/5 transition-all duration-500 hover:-translate-y-1 hover:border-white/10"
                  >
                    <img loading="lazy" decoding="async" src={img.path} alt={img.altText || ""} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                    <div className="absolute left-5 top-5 px-3 py-1.5 rounded-full text-[11px] tracking-[0.12em] uppercase backdrop-blur-md bg-black/30 border border-white/10">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-5 mt-10">
          <div className="h-px w-16 bg-white/10" />
          <div className="text-xs tracking-[0.3em] text-white/40 uppercase">
            {String(currentIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
          </div>
          <div className="h-px w-16 bg-white/10" />
        </div>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedIndex(null)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Poprzednie zdjęcie"
              className="absolute left-4 md:left-8 z-50 h-14 w-14 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/80 transition-all duration-300 hover:bg-white/20 hover:text-white"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <motion.img
              src={selectedImage.path}
              alt={selectedImage.altText || ""}
              className="w-[92%] max-w-6xl max-h-[88vh] object-contain rounded-2xl shadow-[0_25px_120px_rgba(0,0,0,0.65)]"
              initial={{ scale: 0.98, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0.8 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Następne zdjęcie"
              className="absolute right-4 md:right-8 z-50 h-14 w-14 flex items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/80 transition-all duration-300 hover:bg-white/20 hover:text-white"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
