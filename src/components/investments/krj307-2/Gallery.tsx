"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";

type GalleryImage = { path: string; altText?: string };

type GalleryFields = {
  header?: EditableValue<string> | string;
  gallery?: EditableValue<GalleryImage[]> | GalleryImage[];
};

export default function Gallery({ fields }: { fields: GalleryFields }) {
  const header = unwrap(fields.header) ?? "";
  const images = unwrap(fields.gallery) ?? [];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center", dragFree: false });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(() => images.length > 1);

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

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setSelectedIndex(index);
  };

  const handleNext = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return prev;
      const next = Math.min(prev + 1, images.length - 1);
      setCurrentIndex(next);
      return next;
    });
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => {
      if (prev === null) return prev;
      const next = Math.max(prev - 1, 0);
      setCurrentIndex(next);
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setSelectedIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <section id="galeria">
      <div className="py-12 md:py-24">
        <div className="container max-w-[1596px] mx-auto px-6">
          <h2 className="font-poppins text-[#856F5B] text-4xl md:text-5xl lg:text-[65px] font-extralight mb-12 md:mb-24">{header}</h2>
        </div>

        <div className="overflow-hidden w-full px-4 relative">
          <button
            onClick={scrollPrev}
            aria-label="Poprzednie zdjęcie"
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 h-12 w-12 flex items-center justify-center rounded-full backdrop-blur-xl bg-black/10 border border-black/10 transition-all duration-300 hover:bg-black/20 hover:scale-105 ${canScrollPrev ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg className="w-6 h-6 text-[#856F5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={scrollNext}
            aria-label="Następne zdjęcie"
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 h-12 w-12 flex items-center justify-center rounded-full backdrop-blur-xl bg-black/10 border border-black/10 transition-all duration-300 hover:bg-black/20 hover:scale-105 ${canScrollNext ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg className="w-6 h-6 text-[#856F5B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {images.map((img, index) => (
                <div key={img.path} className="min-w-[300px] md:min-w-[550px] mr-4">
                  <div onClick={() => handleImageClick(index)} className="cursor-pointer">
                    <img loading="lazy" decoding="async" src={img.path} alt={img.altText || ""} className="w-full h-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
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
              className="text-white text-3xl p-0 md:px-4"
              aria-label="Poprzednie zdjęcie"
            >
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="m15 19-7-7 7-7" />
              </svg>
            </button>

            <motion.img
              src={selectedImage.path}
              alt={selectedImage.altText || ""}
              className="rounded-lg shadow-2xl w-[80%] h-auto max-w-4xl"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="text-white text-3xl p-0 md:px-4"
              aria-label="Następne zdjęcie"
            >
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="m9 5 7 7-7 7" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
