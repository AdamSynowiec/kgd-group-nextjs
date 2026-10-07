import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Step = { header: string; content: string };

type TimelineFields = {
  steps?: EditableValue<Step[]> | Step[];
};

/** Pionowa oś z numerowanymi etapami — numer w ciemnej plakietce (jak Steps w /wykonczenie-pod-klucz), złota linia łącząca etapy. */
export default function Timeline({ fields }: { fields: TimelineFields }) {
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section className="bg-white pb-20 md:pb-28 font-poppins">
      <Container>
        <div className="border-t border-black/[0.08] pt-12 md:pt-16">
          {steps.map((step, i) => (
            <div key={step.header} className="flex gap-6 md:gap-10">
              <div className="flex flex-col items-center flex-none">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#141414] text-[#C9AB8B] font-ranade-variable text-sm">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < steps.length - 1 && <div className="mt-3 w-px flex-1 bg-[#C9AB8B]/40" />}
              </div>
              <div className="pb-12 max-w-3xl">
                <h3 className="font-ranade-variable font-light text-[22px] md:text-[28px] leading-snug">{step.header}</h3>
                <p className="mt-3 text-[16px] text-[#6b6b6b] font-light leading-relaxed whitespace-pre-line">{step.content}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
