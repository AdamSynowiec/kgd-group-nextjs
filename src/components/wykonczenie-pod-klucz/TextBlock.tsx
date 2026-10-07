"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Cta = { label: string; href: string };

type TextBlockFields = {
  header: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  cta?: EditableValue<Cta> | Cta;
  tint?: EditableValue<boolean> | boolean;
};

/**
 * Edytorialny układ "magazynowy": duży nagłówek (Ranade) po lewej, treść +
 * CTA po prawej, oddzielone cienką pionową linią — zamiast wyśrodkowanego,
 * sztywnego bloku tekstu. Pierwszy akapit wyróżniony większym rozmiarem.
 */
export default function TextBlock({ fields }: { fields: TextBlockFields }) {
  const header = unwrap(fields.header);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const cta = unwrap(fields.cta);
  const tint = unwrap(fields.tint);

  return (
    <section className={`py-20 md:py-32 font-poppins ${tint ? "bg-[#FBFBFB]" : "bg-white"}`}>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="grid lg:grid-cols-12 gap-10 lg:gap-16"
        >
          <div className="lg:col-span-5">
            <span className="block h-[3px] w-14 bg-[#C9AB8B]" />
            <h2 className="mt-7 font-ranade-variable font-light text-[32px] md:text-[48px] lg:text-[54px] leading-[1.05]">{header}</h2>
          </div>

          <div className="lg:col-span-7 lg:border-l lg:border-black/[0.08] lg:pl-14 mt-8 lg:mt-0">
            <div className="space-y-6">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={`font-light leading-relaxed ${
                    index === 0 ? "text-[19px] md:text-[23px] text-[#1a1a1a]" : "text-[16px] md:text-[17px] text-[#6b6b6b]"
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {cta && (
              <div className="mt-10">
                <Link
                  href={cta.href}
                  className="group inline-flex items-center gap-4 rounded-full border border-[#141414] pl-7 pr-2 py-2 text-[13px] uppercase tracking-[0.2em] text-[#141414] transition-colors duration-300 hover:border-[#C9AB8B] hover:text-[#C9AB8B]"
                >
                  {cta.label}
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-[#141414] text-white transition-all duration-300 group-hover:bg-[#C9AB8B] group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
