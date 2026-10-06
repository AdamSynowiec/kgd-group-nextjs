"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Step = { title: string; text: string };

type StepsFields = {
  header: EditableValue<string> | string;
  steps?: EditableValue<Step[]> | Step[];
};

/**
 * "Jak wygląda współpraca" — pięć kart w jednym rzędzie (desktop), przełamane
 * zygzakiem (co druga karta opuszczona niżej) i strzałkami między nimi, zamiast
 * płaskiej, pionowej listy. Plakietka numeru odwraca kolor na hover.
 */
export default function Steps({ fields }: { fields: StepsFields }) {
  const header = unwrap(fields.header);
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section className="relative bg-[#FBFBFB] py-20 md:py-28 font-poppins overflow-hidden">
      <Container>
        <h2 className="font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group relative flex flex-col bg-white p-6 pt-7 ring-1 ring-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_25px_55px_rgba(201,171,139,0.3)] ${
                index % 2 === 1 ? "lg:mt-10" : ""
              }`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#141414] text-[#C9AB8B] font-ranade-variable text-sm transition-colors duration-500 group-hover:bg-[#C9AB8B] group-hover:text-[#141414]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="mt-6 font-ranade-variable text-[19px] md:text-[21px] font-light leading-snug">{step.title}</h3>
              <p className="mt-2 text-[13px] text-[#6b6b6b] font-light leading-relaxed">{step.text}</p>

              {index < steps.length - 1 && (
                <span className="hidden lg:flex absolute top-7 -right-[27px] h-5 w-5 items-center justify-center text-[#C9AB8B]/60 text-base select-none">
                  →
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
