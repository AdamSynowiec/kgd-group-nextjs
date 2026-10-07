"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import { FileDownIcon } from "./icons";

type Guide = { title: string; desc: string; href: string; cta: string };

type KnowledgeFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  guides?: EditableValue<Guide[]> | Guide[];
};

/** Poradniki do pobrania — kafelki w rotacji ciemny/jasny (jak FeatureGrid w /wykonczenie-pod-klucz) z przyciskiem outline ze strzałką. */
export default function Knowledge({ fields }: { fields: KnowledgeFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const guides = unwrap(fields.guides) ?? [];

  return (
    <section id="baza-wiedzy" className="bg-white py-20 md:py-28 font-poppins">
      <Container>
        <SectionHeading eyebrow={eyebrow} header={header} text={text} />

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {guides.map((guide, index) => {
            const dark = index % 2 === 0;
            return (
              <motion.article
                key={guide.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: (index % 2) * 0.1 }}
                className={`group flex flex-col p-8 md:p-10 transition-all duration-500 hover:-translate-y-2 ${
                  dark ? "bg-[#141414] text-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.35)]" : "bg-[#FBF8F4] text-[#141414] hover:shadow-[0_30px_60px_rgba(201,171,139,0.3)]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="h-[3px] w-10 bg-[#C9AB8B]" />
                  <span className="text-[#C9AB8B]">
                    <FileDownIcon />
                  </span>
                </div>

                <h3 className="mt-8 font-ranade-variable font-light text-[22px] md:text-[28px] leading-snug">{guide.title}</h3>
                <p className={`mt-3 text-sm font-light leading-relaxed ${dark ? "text-white/60" : "text-black/55"}`}>{guide.desc}</p>

                <a
                  href={guide.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-10 inline-flex items-center gap-3 self-start rounded-full border px-7 py-3 text-[12px] uppercase tracking-[0.2em] transition-all duration-300 hover:border-[#C9AB8B] hover:text-[#C9AB8B] ${
                    dark ? "border-white/25 text-white" : "border-[#141414] text-[#141414]"
                  }`}
                >
                  {guide.cta}
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </a>
              </motion.article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
