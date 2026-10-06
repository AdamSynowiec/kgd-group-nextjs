import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Cta = { label: string; href: string };

type ClosingCtaFields = {
  header: EditableValue<string> | string;
  message?: EditableValue<string> | string;
  cta?: Cta;
};

/** Zamykająca sekcja strony — ciemny pas, nagłówek + treść + CTA do kontaktu. */
export default function ClosingCta({ fields }: { fields: ClosingCtaFields }) {
  const header = unwrap(fields.header);
  const message = unwrap(fields.message);
  const cta = fields.cta;

  return (
    <section className="bg-[#141414] py-16 md:py-20 font-poppins text-center text-white">
      <Container className="max-w-2xl">
        <h2 className="text-2xl md:text-4xl font-light">{header}</h2>
        {message && <p className="mt-5 text-white/80 font-light leading-relaxed">{message}</p>}

        {cta && (
          <div className="mt-8">
            <Link
              href={cta.href}
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-light tracking-wide bg-[#C9AB8B] text-white border border-[#C9AB8B] transition-all duration-300 hover:bg-transparent hover:text-[#C9AB8B] hover:border-white"
            >
              {cta.label}
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
