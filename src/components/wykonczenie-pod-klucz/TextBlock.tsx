"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Cta = { label: string; href: string };

type TextBlockFields = {
  header: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  cta?: Cta;
  tint?: EditableValue<boolean> | boolean;
};

/** Nagłówek (Ranade) + jeden lub więcej akapitów, opcjonalny link CTA — blok tekstowy wielokrotnego użytku. */
export default function TextBlock({ fields }: { fields: TextBlockFields }) {
  const header = unwrap(fields.header);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const cta = fields.cta;
  const tint = unwrap(fields.tint);

  return (
    <section className={`py-20 md:py-28 font-poppins ${tint ? "bg-[#FBFBFB]" : "bg-white"}`}>
      <Container className="max-w-3xl text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6 }}>
          <h2 className="font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>

          <div className="mt-7 space-y-5">
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-[#5a5a5a] font-light leading-relaxed text-[16px] md:text-[17px]">
                {paragraph}
              </p>
            ))}
          </div>

          {cta && (
            <div className="mt-9">
              <Link
                href={cta.href}
                className="group inline-flex items-center gap-2 border-b border-[#C9AB8B]/50 pb-2 text-[13px] uppercase tracking-[0.2em] text-[#8a6b47] transition-colors duration-300 hover:border-[#C9AB8B] hover:text-[#C9AB8B]"
              >
                {cta.label}
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
