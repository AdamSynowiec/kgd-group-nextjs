"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import { CheckIcon } from "./icons";

type Service = { header: string; intro?: string; items: string[] };

type ServiceAreasFields = {
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  services?: EditableValue<Service[]> | Service[];
};

type Variant = "gold" | "dark" | "light";
const VARIANTS: Variant[] = ["gold", "dark", "light"];

const cardStyles: Record<Variant, string> = {
  gold: "bg-[#C9AB8B] text-[#1a1410] hover:shadow-[0_30px_60px_rgba(201,171,139,0.45)]",
  dark: "bg-[#141414] text-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.35)]",
  light: "bg-[#FBF8F4] text-[#141414] hover:shadow-[0_30px_60px_rgba(201,171,139,0.3)]",
};
const numberStyles: Record<Variant, string> = {
  gold: "text-black/[0.12]",
  dark: "text-white/[0.08] group-hover:text-[#C9AB8B]/25",
  light: "text-black/[0.06] group-hover:text-[#C9AB8B]/30",
};
const textStyles: Record<Variant, string> = { gold: "text-black/65", dark: "text-white/65", light: "text-black/60" };
const checkStyles: Record<Variant, string> = { gold: "text-[#1a1410]", dark: "text-[#C9AB8B]", light: "text-[#C9AB8B]" };
const barStyles: Record<Variant, string> = { gold: "bg-[#1a1410]", dark: "bg-[#C9AB8B]", light: "bg-[#C9AB8B]" };

/** Obszary wsparcia jako kafelki w rotacji złoty/ciemny/jasny — ten sam język co FeatureGrid w /wykonczenie-pod-klucz. Dane: {header, intro, items[]} (bez raw HTML). */
export default function ServiceAreas({ fields }: { fields: ServiceAreasFields }) {
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const services = unwrap(fields.services) ?? [];

  return (
    <section id="wsparcie" className="bg-[#FBFBFB] py-20 md:py-28 font-poppins">
      <Container>
        <SectionHeading header={header} text={text} />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const variant = VARIANTS[i % VARIANTS.length];
            return (
              <motion.div
                key={service.header}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className={`group relative flex flex-col p-8 transition-all duration-500 hover:-translate-y-2 ${cardStyles[variant]}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`h-[3px] w-10 ${barStyles[variant]}`} />
                  <span className={`font-ranade-variable font-thin text-[64px] leading-none select-none transition-colors duration-500 ${numberStyles[variant]}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-6 font-ranade-variable font-light text-[21px] md:text-[24px] leading-snug">{service.header}</h3>
                {service.intro && <p className={`mt-3 text-sm font-light leading-relaxed ${textStyles[variant]}`}>{service.intro}</p>}

                <ul className="mt-5 space-y-2.5">
                  {service.items.map((item) => (
                    <li key={item} className={`flex items-start gap-3 text-sm font-light leading-relaxed ${textStyles[variant]}`}>
                      <CheckIcon className={`mt-1 h-4 w-4 flex-none ${checkStyles[variant]}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
