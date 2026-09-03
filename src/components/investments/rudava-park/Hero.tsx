"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

const images = [
  "/investments/rudava-park/gallery/rudava-park-07.webp",
  "/investments/rudava-park/gallery/rudava-park-01.webp",
  "/investments/rudava-park/gallery/rudava-park-02.webp",
];

type HeroFields = {
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
};

export default function Hero({ fields }: { fields: HeroFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const buttonLabel = unwrap(fields.buttonLabel);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen bg-black overflow-hidden">
      {images.map((img, i) => (
        <motion.img
          key={img}
          src={img}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          animate={{ opacity: i === index ? 1 : 0, scale: i === index ? 1.05 : 1.1 }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/60" />

      <Container>
        <div className="relative z-10 min-h-screen flex flex-col justify-center pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="max-w-4xl text-white"
          >
            <h1 className="font-ranade-variable text-[34px] md:text-[64px] leading-tight mb-6 text-shadow-xl">
              {header}
            </h1>

            {subHeader && (
              <p className="font-ranade-variable font-thin text-[18px] md:text-[24px] text-white/85 max-w-3xl text-shadow-xl">
                {subHeader}
              </p>
            )}

            {buttonLabel && (
              <div className="mt-10">
                <a href="#oferta">
                  <button className="font-ranade-variable text-[14px] uppercase tracking-[0.2em] text-white border-b border-white/40 pb-2 hover:border-white transition-all duration-300 cursor-pointer">
                    {buttonLabel}
                  </button>
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
