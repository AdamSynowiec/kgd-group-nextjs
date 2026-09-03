"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

const images = [1, 2, 4, 5].map((n) => `/investments/pod-stokiem-apartamenty/vis/pod-stokiem-apartamenty-0${n}.webp`);

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
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-black relative w-full min-h-screen overflow-hidden">
      <AnimatePresence>
        <motion.div
          key={index}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(36,36,36,0.55) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%), url(${images[index]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/20 z-[1]" />

      <Container>
        <div className="flex flex-col justify-center min-h-screen pt-24 md:pt-32 relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }} className="mx-auto text-center max-w-6xl text-white">
            <h1 className="font-libre-caslon text-4xl md:text-6xl/[84px] font-bold leading-tight drop-shadow-lg">{header}</h1>

            {subHeader && <p className="max-w-4xl mx-auto font-poppins font-light mt-6 text-lg md:text-2xl/[36px] drop-shadow-lg">{subHeader}</p>}

            {buttonLabel && (
              <a href="#oferta">
                <button className="cursor-pointer mt-10 px-8 py-4 border border-white/40 text-white text-sm md:text-base tracking-wide uppercase rounded-full backdrop-blur-md bg-white/5 hover:bg-white/10 hover:border-white/70 transition-all duration-300 shadow-lg hover:shadow-white/10 active:scale-[0.98]">
                  {buttonLabel}
                </button>
              </a>
            )}
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
