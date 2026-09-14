import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { CheckCircleIcon } from "./icons";

type BenefitsFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  benefits?: EditableValue<string[]> | string[];
};

/** Mirror kgd-building/Benefits.jsx — lista korzyści w kartach 2 kolumny. */
export default function Benefits({ fields }: { fields: BenefitsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const benefits = unwrap(fields.benefits) ?? [];

  return (
    <section id="korzysci" className="py-16 md:py-20 font-poppins">
      <Container>
        <div className="text-center">
          {eyebrow && <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{eyebrow}</span>}
          <h2 className="mt-3 text-3xl md:text-4xl font-light">{header}</h2>
          {text && <p className="mt-4 text-[#4a4a4a] font-light">{text}</p>}
        </div>

        <div className="mt-12 max-w-3xl mx-auto">
          <ul className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="group flex items-start gap-3 rounded-md bg-white border border-[#eee] p-5 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1"
              >
                <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-none text-[#C9AB8B] transition-transform duration-300 group-hover:scale-110" />
                <span className="text-sm sm:text-base text-[#4a4a4a]">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
