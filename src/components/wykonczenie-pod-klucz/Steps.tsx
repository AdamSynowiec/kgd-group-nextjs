"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Step = { title: string; text: string };

type StepsFields = {
  header: EditableValue<string> | string;
  steps?: EditableValue<Step[]> | Step[];
};

/** Edytorialny spis etapów ("Jak wygląda współpraca") — numer + tytuł w jednej linii, cienka linia, opis pod spodem. */
export default function Steps({ fields }: { fields: StepsFields }) {
  const header = unwrap(fields.header);
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section className="relative bg-[#FBFBFB] py-20 md:py-28 font-poppins overflow-hidden">
      <Container className="max-w-4xl">
        <h2 className="font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>

        <div className="mt-14 border-t border-black/[0.08]">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: index * 0.07 }}
              className="group border-b border-black/[0.08] py-7 md:py-8 transition-colors duration-500 hover:bg-white"
            >
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                <span className="font-ranade-variable text-[13px] tracking-[0.25em] text-[#C9AB8B]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="font-ranade-variable text-[20px] md:text-[27px] font-light transition-transform duration-500 group-hover:translate-x-1.5">
                  {step.title}
                </h3>
              </div>
              <p className="mt-2 md:ml-[52px] text-[#6b6b6b] font-light leading-relaxed max-w-xl">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
