import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Step = { title: string; text: string };

type StepsFields = {
  header: EditableValue<string> | string;
  steps?: EditableValue<Step[]> | Step[];
};

/** Mirror src/components/kgd-building/Timeline.tsx — pionowa oś z numerowanymi etapami ("Jak wygląda współpraca"). */
export default function Steps({ fields }: { fields: StepsFields }) {
  const header = unwrap(fields.header);
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section className="bg-[#FBFBFB] py-16 md:py-20 font-poppins">
      <Container>
        <h2 className="text-center text-2xl md:text-4xl font-light">{header}</h2>

        <div className="mt-14 max-w-2xl mx-auto space-y-10">
          {steps.map((step, index) => (
            <div key={step.title} className="flex gap-6 md:gap-10">
              <div className="flex flex-col items-center flex-none">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] font-medium text-sm">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {index < steps.length - 1 && <div className="mt-3 w-px flex-1 bg-[#ddd]" />}
              </div>
              <div className="pb-2">
                <h3 className="text-lg md:text-xl font-light">{step.title}</h3>
                <p className="mt-2 text-[#4a4a4a] font-light leading-relaxed">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
