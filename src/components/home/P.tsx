"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const baseClass = "text-[#717171] font-montserrat text-[18px]/[32px] sm:text-[18px]/[32px] md:text-[22px]/[36px] lg:text-[22px]/[40px] xl:text-[24px]/[44px] font-light";

export default function P({
  children,
  className = "",
  reveal = false,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  reveal?: boolean;
  delay?: number;
}) {
  if (!reveal) return <p className={`${baseClass} ${className}`.trim()}>{children}</p>;

  return (
    <motion.p
      className={`${baseClass} ${className}`.trim()}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay: delay / 1000 }}
    >
      {children}
    </motion.p>
  );
}
