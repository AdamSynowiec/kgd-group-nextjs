"use client";

import { motion } from "framer-motion";

type StatLine = { value: string; label: string };

/**
 * Komórka płaskiej, dzielonej siatki statystyk (jak Highlights w
 * /wykonczenie-pod-klucz): złota ikona, nagłówek Ranade, opcjonalne linie
 * "wartość + etykieta". Lokalny duplikat — każda rodzina szablonów trzyma
 * własne prymitywy. "lines" zamiast surowego HTML-a ze starego projektu.
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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
      className={`group flex flex-col items-center text-center px-6 py-12 transition-colors duration-500 hover:bg-[#FBFBFB] ${className}`}
    >
      <img loading="lazy" decoding="async" src={icon} alt="" className="h-[40px] mb-6 transition-transform duration-500 group-hover:scale-105" />

      <span className="font-ranade-variable font-light text-[20px] md:text-[22px] leading-tight max-w-[240px]">{header}</span>

      {lines && (
        <p className="mt-4 text-[14px] md:text-[15px] font-light leading-relaxed text-black/50 max-w-[260px]">
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
