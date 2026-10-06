"use client";

import { useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { ChevronDownIcon } from "./icons";

type FaqItem = { question: string; answer: string };

type FaqFields = {
  header: EditableValue<string> | string;
  items?: EditableValue<FaqItem[]> | FaqItem[];
};

/**
 * Akordeon FAQ. Pole "items" (question/answer) jest też bezpośrednim źródłem
 * danych strukturalnych FAQPage — patrz buildFaqPage() w src/lib/schema.ts,
 * które czyta tę samą sekcję po id, niezależnie od tego komponentu.
 */
export default function Faq({ fields }: { fields: FaqFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 md:py-20 font-poppins">
      <Container className="max-w-3xl">
        <h2 className="text-center text-2xl md:text-4xl font-light">{header}</h2>

        <div className="mt-10 divide-y divide-[#eee] border-t border-b border-[#eee]">
          {items.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-base md:text-lg font-light">{item.question}</span>
                  <ChevronDownIcon
                    className={`h-[14px] w-[14px] flex-none text-[#C9AB8B] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-5" : "max-h-0"}`}>
                  <p className="text-[#4a4a4a] font-light leading-relaxed">{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
