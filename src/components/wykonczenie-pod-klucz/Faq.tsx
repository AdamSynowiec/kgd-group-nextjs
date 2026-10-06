"use client";

import { useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type FaqItem = { question: string; answer: string };

type FaqFields = {
  header: EditableValue<string> | string;
  items?: EditableValue<FaqItem[]> | FaqItem[];
};

/**
 * Akordeon FAQ w edytorialnym stylu listy (cienkie linie, numer, "+" obracające
 * się w "×"). Pole "items" (question/answer) jest też bezpośrednim źródłem
 * danych strukturalnych FAQPage — patrz buildFaqPage() w src/lib/schema.ts,
 * które czyta tę samą sekcję po id, niezależnie od tego komponentu.
 */
export default function Faq({ fields }: { fields: FaqFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-20 md:py-28 font-poppins bg-white">
      <Container className="max-w-3xl">
        <h2 className="font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>

        <div className="mt-14 border-t border-black/[0.08]">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question} className="border-b border-black/[0.08]">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center gap-5 py-6 text-left cursor-pointer group"
                  aria-expanded={isOpen}
                >
                  <span className="font-ranade-variable text-[13px] tracking-[0.25em] text-[#C9AB8B] flex-none">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-ranade-variable text-[18px] md:text-[23px] font-light flex-1 transition-transform duration-500 group-hover:translate-x-1">
                    {item.question}
                  </span>
                  <span
                    className={`grid h-8 w-8 flex-none place-items-center rounded-full border transition-all duration-300 ${
                      isOpen ? "border-[#C9AB8B] bg-[#C9AB8B] text-white rotate-45" : "border-black/15 text-black/50"
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-7" : "max-h-0"}`}>
                  <p className="md:ml-[52px] text-[#5a5a5a] font-light leading-relaxed max-w-xl">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
