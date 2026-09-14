"use client";

import { motion } from "framer-motion";

type StatLine = { value: string; label: string };

/**
 * Mirror src/components/home/Card.tsx (ikona + nagłówek + statystyka) —
 * duplikat lokalny, nie import z home/, bo każda rodzina szablonów trzyma
 * własne prymitywy (patrz Container.tsx, Deweloper.tsx per inwestycja).
 * "lines" zamiast surowego HTML-a ("<span>10</span> INWESTYCJI") ze starego
 * projektu — bez dangerouslySetInnerHTML, patrz home/Card.tsx.
 */
export default function Card({
  icon,
  header,
  lines,
  delay = 0,
  className = "",
}: {
  icon: string;
  header: string;
  lines?: StatLine[];
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay: delay / 1000 }}
      className={`group w-full flex flex-col items-center text-center py-4 sm:py-10 px-6 transition-colors ${className}`}
    >
      <img loading="lazy" decoding="async" src={icon} alt="" className="h-[44px] mb-6 transition-transform duration-500 group-hover:scale-105" />

      <span className="font-poppins text-[12px] uppercase tracking-[0.15em] text-gray-500 mb-3">{header}</span>

      {lines && (
        <p className="font-poppins text-[15px]/[26px] md:text-[17px]/[28px] font-light text-gray-700 max-w-[280px]">
          {lines.map((line, i) => (
            <span key={line.label}>
              {i > 0 && <br />}
              <span className="text-[#C9AB8B] font-medium">{line.value}</span> {line.label}
            </span>
          ))}
        </p>
      )}
    </motion.div>
  );
}
