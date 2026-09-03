"use client";

import { motion } from "framer-motion";

type StatLine = { value: string; label: string };

export default function Card({
  icon,
  header,
  content,
  lines,
  delay = 0,
  className = "",
}: {
  icon: string;
  header: string;
  content?: string;
  /** Alternatywa dla `content` — statystyki z podświetloną liczbą (bez dangerouslySetInnerHTML, patrz stary Card.jsx). */
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
      <img loading="lazy" decoding="async" src={icon} className="h-[56px] mb-8 transition-transform duration-500 group-hover:scale-105" alt="" />

      <span className="font-poppins text-[13px] uppercase tracking-[0.08em] text-gray-500 mb-3">{header}</span>

      {lines ? (
        <p className="font-poppins text-[16px]/[28px] md:text-[20px]/[32px] font-light text-gray-700 max-w-[320px]">
          {lines.map((line, i) => (
            <span key={line.label}>
              {i > 0 && <br />}
              <span className="text-[#C9AB8B] font-medium">{line.value}</span> {line.label}
            </span>
          ))}
        </p>
      ) : (
        content && <p className="font-poppins text-[16px]/[28px] md:text-[20px]/[32px] font-light text-gray-700 max-w-[320px]">{content}</p>
      )}
    </motion.div>
  );
}
