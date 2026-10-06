import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Cta = { label: string; href: string };

type TextBlockFields = {
  header: EditableValue<string> | string;
  paragraphs?: EditableValue<string[]> | string[];
  cta?: Cta;
  tint?: EditableValue<boolean> | boolean;
};

/** Nagłówek + jeden lub więcej akapitów, opcjonalny przycisk CTA — blok tekstowy wielokrotnego użytku. */
export default function TextBlock({ fields }: { fields: TextBlockFields }) {
  const header = unwrap(fields.header);
  const paragraphs = unwrap(fields.paragraphs) ?? [];
  const cta = fields.cta;
  const tint = unwrap(fields.tint);

  return (
    <section className={`py-16 md:py-20 font-poppins ${tint ? "bg-[#FBFBFB]" : ""}`}>
      <Container className="max-w-3xl text-center">
        <h2 className="text-2xl md:text-4xl font-light">{header}</h2>

        <div className="mt-6 space-y-5">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[#4a4a4a] font-light leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>

        {cta && (
          <div className="mt-8">
            <Link
              href={cta.href}
              className="inline-flex items-center justify-center px-7 py-3 rounded-full font-light tracking-wide bg-[#C9AB8B] text-white border border-[#C9AB8B] transition-all duration-300 hover:bg-transparent hover:text-[#C9AB8B] hover:shadow-[0_10px_30px_rgba(201,171,139,0.25)]"
            >
              {cta.label}
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
