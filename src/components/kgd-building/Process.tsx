"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import SectionHeading from "./SectionHeading";
import { CheckIcon, ClipboardIcon, HardHatIcon, BuildingIcon, ShieldIcon, KeyIcon } from "./icons";

type Step = { id: string; icon: string; title: string; items: string[] };

type ProcessFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  quote?: EditableValue<string> | string;
  steps?: EditableValue<Step[]> | Step[];
};

const stepIcons: Record<string, typeof ClipboardIcon> = {
  clipboard: ClipboardIcon,
  hardhat: HardHatIcon,
  building: BuildingIcon,
  shield: ShieldIcon,
  key: KeyIcon,
};

/** Kroki współpracy jako białe karty z ciemną plakietką numeru (odwracaną na hover) — jak Steps w /wykonczenie-pod-klucz; cytat na dole w złotym akcencie. */
export default function Process({ fields }: { fields: ProcessFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const quote = unwrap(fields.quote);
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section id="proces" className="bg-[#FBFBFB] py-20 md:py-28 font-poppins">
      <Container>
        <SectionHeading eyebrow={eyebrow} header={header} />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = stepIcons[step.icon] ?? ClipboardIcon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
                className="group relative flex flex-col bg-white p-7 ring-1 ring-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_25px_55px_rgba(201,171,139,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-[#141414] text-[#C9AB8B] font-ranade-variable text-sm transition-colors duration-500 group-hover:bg-[#C9AB8B] group-hover:text-[#141414]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon />
                </div>

                <h3 className="mt-6 font-ranade-variable font-light text-[21px] md:text-[24px] leading-snug">{step.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {step.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-[13px] text-[#6b6b6b] font-light leading-relaxed">
                      <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#C9AB8B]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {quote && (
          <div className="mt-14 border-l-[3px] border-[#C9AB8B] pl-6 md:pl-10">
            <p className="font-ranade-variable font-light italic text-[22px] md:text-[30px] leading-snug max-w-4xl">{quote}</p>
          </div>
        )}
      </Container>
    </section>
  );
}
