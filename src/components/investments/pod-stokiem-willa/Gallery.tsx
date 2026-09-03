"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type GalleryImage = { url: string };

type GalleryFields = {
  gallery?: EditableValue<GalleryImage[]> | GalleryImage[];
};

export default function Gallery({ fields }: { fields: GalleryFields }) {
  const images = unwrap(fields.gallery) ?? [];

  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openGallery = (index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  };

  const closeGallery = () => setIsOpen(false);

  const prevImage = () => setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const nextImage = () => setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeGallery();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, images.length]);

  return (
    <>
      <div id="wizualizacje" className="bg-[#F6F6F6]">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-[44px]">
            {images.map((item, index) => (
              <div key={item.url} className="relative cursor-pointer" onClick={() => openGallery(index)}>
                <img loading="lazy" decoding="async" src={item.url} alt="" className="w-full" />
                <img loading="lazy" decoding="async" src="/investments/pod-stokiem-willa/logo.svg" alt="" className="absolute z-10 right-4 bottom-4" />
              </div>
            ))}
          </div>
        </Container>
      </div>

      {isOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <button onClick={closeGallery} className="absolute top-6 right-6 text-white text-3xl cursor-pointer" aria-label="Zamknij">
            ✕
          </button>

          <button onClick={prevImage} className="absolute left-6 text-white text-5xl select-none cursor-pointer" aria-label="Poprzednie zdjęcie">
            ‹
          </button>

          <img loading="lazy" decoding="async" src={images[currentIndex].url} alt="" className="max-h-[90vh] max-w-[90vw]" />

          <button onClick={nextImage} className="absolute right-6 text-white text-5xl select-none cursor-pointer" aria-label="Następne zdjęcie">
            ›
          </button>
        </div>
      )}
    </>
  );
}
