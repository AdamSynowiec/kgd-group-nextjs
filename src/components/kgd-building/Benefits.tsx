"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import SectionHeading from "./SectionHeading";

type BenefitsFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  benefits?: EditableValue<string[]> | string[];
};

/** Korzyści jako lista w stylu FAQ z /wykonczenie-pod-klucz: cienkie linie, złoty numer, tekst przesuwa się na hover; dwie kolumny na desktopie. */
export default function Benefits({ fields }: { fields: BenefitsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const benefits = unwrap(fields.benefits) ?? [];

  return (
    <section id="korzysci" className="bg-white py-20 md:py-28 font-poppins">
      <Container>
        <SectionHeading eyebrow={eyebrow} header={header} text={text} />

        <div className="mt-14 grid md:grid-cols-2 md:gap-x-16 border-t border-black/[0.08]">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: (index % 2) * 0.08 }}
              className="group flex items-start gap-5 border-b border-black/[0.08] py-6"
            >
              <span className="font-ranade-variable text-[13px] tracking-[0.25em] text-[#C9AB8B] flex-none pt-1">{String(index + 1).padStart(2, "0")}</span>
              <span className="font-ranade-variable text-[18px] md:text-[21px] font-light leading-snug transition-transform duration-500 group-hover:translate-x-1">{benefit}</span>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
