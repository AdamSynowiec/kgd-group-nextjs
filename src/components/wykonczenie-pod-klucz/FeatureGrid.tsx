"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Item = { title: string; text: string };

type FeatureGridFields = {
  header: EditableValue<string> | string;
  items?: EditableValue<Item[]> | Item[];
  tint?: EditableValue<boolean> | boolean;
};

/**
 * Edytorialna lista numerowana — "Pełny zakres" / "Co zyskujesz" (jeden komponent,
 * dwa razy na stronie). Duże, przygaszone cyfry-tło w stylu agencyjnych list
 * usług, zamiast siatki kart.
 */
export default function FeatureGrid({ fields }: { fields: FeatureGridFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];
  const tint = unwrap(fields.tint);

  return (
    <section className={`py-20 md:py-28 font-poppins ${tint ? "bg-[#FBFBFB]" : "bg-white"}`}>
      <Container className="max-w-4xl">
        <h2 className="font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>

        <div className="mt-14 border-t border-black/[0.08]">
          {items.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: Math.min(index, 4) * 0.08 }}
              className="group grid grid-cols-[56px_1fr] md:grid-cols-[120px_1fr] items-baseline gap-4 md:gap-10 border-b border-black/[0.08] py-7 md:py-9 transition-colors duration-500 hover:bg-white"
            >
              <span className="font-ranade-variable font-thin text-[34px] md:text-[48px] leading-none text-black/10 transition-colors duration-500 group-hover:text-[#C9AB8B]/50">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="transition-transform duration-500 group-hover:translate-x-1.5">
                <h3 className="font-ranade-variable text-[19px] md:text-[23px] font-light">{item.title}</h3>
                <p className="mt-2 text-[#6b6b6b] font-light leading-relaxed max-w-xl">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
