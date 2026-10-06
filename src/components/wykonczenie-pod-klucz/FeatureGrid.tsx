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

type Variant = "gold" | "dark" | "light";

const VARIANTS: Variant[] = ["gold", "dark", "light"];

const cardStyles: Record<Variant, string> = {
  gold: "bg-[#C9AB8B] text-[#1a1410] hover:shadow-[0_30px_60px_rgba(201,171,139,0.45)]",
  dark: "bg-[#141414] text-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.35)]",
  light: "bg-[#FBF8F4] text-[#141414] hover:shadow-[0_30px_60px_rgba(201,171,139,0.3)]",
};

const numberStyles: Record<Variant, string> = {
  gold: "text-black/[0.12] group-hover:text-black/[0.2]",
  dark: "text-white/[0.08] group-hover:text-[#C9AB8B]/25",
  light: "text-black/[0.06] group-hover:text-[#C9AB8B]/30",
};

const descStyles: Record<Variant, string> = {
  gold: "text-black/60",
  dark: "text-white/60",
  light: "text-black/55",
};

const barStyles: Record<Variant, string> = {
  gold: "bg-[#1a1410]",
  dark: "bg-[#C9AB8B]",
  light: "bg-[#C9AB8B]",
};

/**
 * Siatka kafelków z rotacją 3 wariantów koloru (złoty/ciemny/jasny) — "Pełny
 * zakres" / "Co zyskujesz" (jeden komponent, dwa razy na stronie, różna liczba
 * elementów: 5 i 6). Jednolity rozmiar kart (bez row-span) — gwarantuje równą
 * siatkę bez dziur niezależnie od liczby elementów. Duża cyfra w tle,
 * CAŁKOWICIE wewnątrz karty (bez ujemnego przesunięcia), żeby nie obcinało jej
 * overflow-hidden.
 */
export default function FeatureGrid({ fields }: { fields: FeatureGridFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];
  const tint = unwrap(fields.tint);

  return (
    <section className={`py-20 md:py-28 font-poppins ${tint ? "bg-[#FBFBFB]" : "bg-white"}`}>
      <Container>
        <h2 className="font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => {
            const variant = VARIANTS[index % VARIANTS.length];

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
                className={`group relative overflow-hidden min-h-[230px] p-8 flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 ${cardStyles[variant]}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`h-[3px] w-10 ${barStyles[variant]}`} />
                  <span
                    className={`font-ranade-variable font-thin text-[64px] md:text-[80px] leading-none select-none transition-colors duration-500 ${numberStyles[variant]}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="relative mt-auto">
                  <h3 className="font-ranade-variable font-light text-[21px] md:text-[24px]">{item.title}</h3>
                  <p className={`mt-2 text-sm font-light leading-relaxed ${descStyles[variant]}`}>{item.text}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
