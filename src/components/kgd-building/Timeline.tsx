import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Step = { header: string; content: string };

type TimelineFields = {
  steps?: EditableValue<Step[]> | Step[];
};

/** Mirror TimeLine.jsx (kgd-group, użyty 3x w Deweloper.jsx) — pionowa oś z numerowanymi etapami. */
export default function Timeline({ fields }: { fields: TimelineFields }) {
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section className="py-10 md:py-16 font-poppins">
      <Container>
        <div className="space-y-10">
          {steps.map((step, i) => (
            <div key={step.header} className="flex gap-6 md:gap-10">
              <div className="flex flex-col items-center flex-none">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] font-medium">{i + 1}</span>
                {i < steps.length - 1 && <div className="mt-3 w-px flex-1 bg-[#eee]" />}
              </div>
              <div className="pb-4">
                <h3 className="text-xl md:text-2xl font-light mb-3">{step.header}</h3>
                <p className="text-[#4a4a4a] font-light leading-relaxed whitespace-pre-line">{step.content}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
