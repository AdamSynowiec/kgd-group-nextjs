import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
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

/** Mirror kgd-building/Process.jsx — 6 kroków współpracy + cytat na dole. */
export default function Process({ fields }: { fields: ProcessFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const quote = unwrap(fields.quote);
  const steps = unwrap(fields.steps) ?? [];

  return (
    <section id="proces" className="bg-[#FBFBFB] py-16 md:py-20 font-poppins">
      <Container>
        <div className="text-center">
          {eyebrow && <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{eyebrow}</span>}
          <h2 className="mt-3 text-3xl md:text-4xl font-light">{header}</h2>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = stepIcons[step.icon] ?? ClipboardIcon;
            return (
              <div
                key={step.id}
                className="group flex gap-6 rounded-md bg-white p-6 lg:p-8 border border-[#eee] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1"
              >
                <div className="flex flex-col items-center">
                  <div className="text-xs font-semibold tracking-[0.2em] text-[#C9AB8B]">{String(i + 1).padStart(2, "0")}</div>
                  <span className="mt-3 grid h-11 w-11 flex-none place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] transition-colors duration-300 group-hover:bg-[#C9AB8B] group-hover:text-white">
                    <Icon />
                  </span>
                  {i < steps.length - 1 && <div className="mt-3 w-px flex-1 bg-[#eee]" />}
                </div>

                <div className="flex-1">
                  <h3 className="text-xl lg:text-2xl font-light">{step.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {step.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#4a4a4a]">
                        <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#C9AB8B]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {quote && (
          <div className="mt-12 rounded-md bg-white border-l-4 border-[#C9AB8B] p-6 lg:p-8">
            <p className="text-lg italic sm:text-xl font-light">{quote}</p>
          </div>
        )}
      </Container>
    </section>
  );
}
