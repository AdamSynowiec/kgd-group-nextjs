"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type HeroFields = {
  header?: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
};

export default function Hero({ fields }: { fields: HeroFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`transition-all duration-300 ${isScrolled ? "min-h-[50svh]" : "min-h-svh"}`}
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.34) 51%), url(/investments/pylna-residence/hero-bg.webp)",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Container>
        <div className={`flex flex-col justify-center transition-all duration-300 ${isScrolled ? "min-h-[50svh]" : "min-h-svh"}`}>
          <div className="max-w-[1100px] transition-all duration-300">
            <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: false, amount: 0.3 }}>
              <h1
                className={`text-white font-melodrama transition-all duration-300 ${isScrolled ? "text-[32px] md:text-[64px]" : "text-[48px] md:text-[96px]"}`}
              >
                {header}
              </h1>
            </motion.p>
            <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: false, amount: 0.3 }}>
              <p
                className={`text-white font-ranade-variable font-thin transition-all duration-300 ${isScrolled ? "text-[14px] md:text-[18px]" : "text-[18px] md:text-[24px]"}`}
              >
                {subHeader}
              </p>
            </motion.p>
          </div>
        </div>
      </Container>
    </div>
  );
}
