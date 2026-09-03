"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import Separator from "./Separator";

const baseClass =
  "text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-semibold leading-[1.25] text-[#C9AB8B] font-bold font-poppins";

export default function H2({
  children,
  separator,
  className = "",
  reveal = false,
  delay = 0,
}: {
  children: ReactNode;
  separator?: boolean;
  className?: string;
  reveal?: boolean;
  delay?: number;
}) {
  const heading = reveal ? (
    <motion.h2
      className={`${baseClass} ${className}`.trim()}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay: delay / 1000 }}
    >
      {children}
    </motion.h2>
  ) : (
    <h2 className={`${baseClass} ${className}`.trim()}>{children}</h2>
  );

  if (!separator) return heading;

  return (
    <>
      {heading}
      <Separator className="mx-auto my-[32.0px] md:my-[40px]" />
    </>
  );
}
