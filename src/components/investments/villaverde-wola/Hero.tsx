"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type HeroFields = {
  villasLabel?: EditableValue<string> | string;
  contactLabel?: EditableValue<string> | string;
  phone?: EditableValue<string> | string;
  tagline?: EditableValue<string> | string;
  menu?: EditableValue<string[]> | string[];
};

export default function Hero({ fields }: { fields: HeroFields }) {
  const villasLabel = unwrap(fields.villasLabel) ?? "";
  const contactLabel = unwrap(fields.contactLabel) ?? "";
  const phone = unwrap(fields.phone) ?? "";
  const tagline = unwrap(fields.tagline) ?? "";
  const menu = unwrap(fields.menu) ?? [];

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section id="Start" className="relative min-h-[900px] lg:min-h-svh flex flex-col">
      <div
        className="flex-1 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(33, 28, 28, 0.8) 0%, rgba(0, 0, 0, 0.2) 100%), url(/investments/villaverde-wola/hero-bg.webp)",
        }}
      >
        <Container>
          <div className="h-[150px] lg:h-[250px] flex flex-row justify-between items-center">
            <div className="flex w-full items-center justify-center relative lg:hidden">
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <img loading="eager" fetchPriority="high" decoding="async" src="/investments/villaverde-wola/logo.svg" alt="Logo" className="max-w-[160px]" />
              </div>

              <div className="absolute right-0">
                <button className="flex items-center justify-center gap-2 border border-white px-2 rounded-full w-10 h-10" onClick={() => setMenuOpen(true)} aria-label="Menu">
                  <img loading="eager" fetchPriority="high" decoding="async" className="w-5 h-5 block" src="/investments/villaverde-wola/menu-icon.svg" alt="Menu" />
                </button>
              </div>
            </div>

            <div className="hidden lg:flex w-full flex-row justify-between items-center">
              <nav className="w-full">
                <ul className="flex flex-row w-full font-ebgaramond-regular text-white text-[24px]">
                  <li className="w-auto lg:w-1/2">
                    <button className="cursor-pointer hover:bg-white/[0.2] rounded-full" onClick={() => setMenuOpen(true)}>
                      <div className="flex gap-2 px-2 border border-white rounded-full">
                        <img loading="eager" fetchPriority="high" decoding="async" src="/investments/villaverde-wola/menu-icon.svg" alt="Menu" />
                        <span className="block">Menu</span>
                      </div>
                    </button>
                  </li>
                  <li>
                    <a href="#Oferta domów" className="hover:underline">
                      {villasLabel}
                    </a>
                  </li>
                </ul>
              </nav>

              <div>
                <img loading="eager" fetchPriority="high" decoding="async" src="/investments/villaverde-wola/logo.svg" alt="Logo" className="w-[360px]" />
              </div>

              <nav className="w-full">
                <ul className="text-right flex flex-row justify-end w-full font-ebgaramond-regular text-white text-[24px]">
                  <li className="text-left hidden lg:block w-1/2">
                    <a href="#kontakt" className="hover:underline">
                      {contactLabel}
                    </a>
                  </li>
                  <li>
                    <a href={`tel:${phone}`} className="hover:underline">
                      {phone}
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </Container>
      </div>

      <div className="bg-[#1C1D21] relative">
        <Container className="relative h-full flex items-center justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-[32px] items-center">
            <img
              loading="eager"
              fetchPriority="high"
              decoding="async"
              src="/investments/villaverde-wola/logo1.svg"
              alt="Villa Verde logo"
              className="relative top-0 -translate-y-1/2 w-auto"
            />
            <p className="font-ebgaramond-regular font-light leading-relaxed text-[#C8A35F] text-[32px] lg:text-[50px]">{tagline}</p>
          </div>
        </Container>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 bg-[#1C1D21] z-50 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="absolute top-8 right-8 text-white text-4xl" onClick={() => setMenuOpen(false)} aria-label="Zamknij menu">
              ×
            </button>

            <motion.ul
              className="flex flex-col items-center justify-center gap-6 md:gap-12 text-white text-4xl font-ebgaramond-regular"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            >
              {menu.map((item) => (
                <motion.li key={item} className="cursor-pointer" whileHover={{ scale: 1.1 }} onClick={() => setMenuOpen(false)}>
                  <a href={`#${item}`} className="text-[24px] md:text-[32px]">
                    {item}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
