"use client";

import { useEffect, useRef, useState } from "react";
import H2 from "./H2";

const MOBILE_BREAKPOINT = 768;

export type InvestmentCardData = {
  title: string;
  location: string;
  features: string[];
  link?: string;
  images: string[];
  availableApartments?: string;
};

export default function FeatureCard({ title, location, features, link, images, availableApartments }: InvestmentCardData) {
  const hasSlider = images.length > 1;

  const [currentImage, setCurrentImage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nextSlide = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].screenX;
    if (diff > 50) nextSlide();
    if (diff < -50) prevSlide();
  };

  const content = (
    <div className="group h-full flex flex-col">
      <div className="relative w-full pb-[62%] overflow-hidden bg-neutral-200 select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {images.map((src, index) => (
          <img
            key={src}
            src={src}
            alt={title}
            loading="lazy"
            draggable="false"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${index === currentImage ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]"}`}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent z-10" />

        <img loading="lazy" decoding="async" src="/home/logo.svg" alt="" draggable="false" className="absolute w-[46px] right-5 bottom-5 opacity-90 z-20 pointer-events-none" />

        {hasSlider && (
          <>
            <button onClick={prevSlide} type="button" aria-label="Poprzednie zdjęcie" className="absolute left-0 top-0 h-full w-16 flex items-center justify-center z-30 group/btn">
              <div className={`absolute inset-0 bg-gradient-to-r from-black/50 to-transparent transition-opacity duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <span className={`relative text-white text-3xl transition-all duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover/btn:translate-x-1"}`}>‹</span>
            </button>

            <button onClick={nextSlide} type="button" aria-label="Następne zdjęcie" className="absolute right-0 top-0 h-full w-16 flex items-center justify-center z-30 group/btn">
              <div className={`absolute inset-0 bg-gradient-to-l from-black/50 to-transparent transition-opacity duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />
              <span className={`relative text-white text-3xl transition-all duration-300 ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-hover/btn:-translate-x-1"}`}>›</span>
            </button>

            <div className="absolute left-1/2 bottom-5 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md bg-black/20 border border-white/10">
              {images.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Przejdź do zdjęcia ${idx + 1}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImage(idx);
                  }}
                  className={`h-[6px] rounded-full transition-all duration-300 ${idx === currentImage ? "w-8 bg-white" : "w-[6px] bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>

            <div className="absolute top-5 left-5 z-30 text-white text-[12px] font-medium tracking-[0.08em] uppercase px-3 py-1.5 rounded-full backdrop-blur-md bg-black/20 border border-white/10">
              {String(currentImage + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col justify-between flex-1 bg-white border border-neutral-200 border-t-0 p-8 transition-all duration-300 group-hover:border-neutral-400">
        <div>
          <H2 className={`mb-2 md:!text-[20px] ${link ? "hover:underline" : ""}`}>{title}</H2>
          <span className="block text-[13px] uppercase tracking-[0.08em] text-gray-500 font-poppins mb-2">{location}</span>

          <ul className="mt-3 space-y-1 text-[14px]/[24px] text-gray-500 font-poppins tracking-[0.01em]">
            {features.map((feature) => (
              <li key={feature} className="flex">
                <span className="mr-2 text-gray-400">—</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {link && (
          <div className="mt-8 pt-6 border-t border-gray-200 font-poppins text-[14px] text-gray-700 flex flex-col gap-3 sm:flex-row sm:items-center justify-between transition-colors group-hover:text-black">
            <span className="hover:underline text-base sm:text-[14px]">Zobacz szczegóły inwestycji</span>
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              {availableApartments && <span className="text-[12px] uppercase tracking-[0.08em] text-[#C9AB8B] whitespace-nowrap">{availableApartments}</span>}
              <span className="text-[#C9AB8B] transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      onClick={() => {
        if (link) window.location.href = link;
      }}
      className={`block h-full ${link ? "cursor-pointer" : ""}`}
    >
      {content}
    </div>
  );
}
