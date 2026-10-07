import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Cta = { label: string; href: string };

type ClosingCtaFields = {
  header: EditableValue<string> | string;
  message?: EditableValue<string> | string;
  cta?: EditableValue<Cta> | Cta;
};

/** Zamykająca sekcja strony — ciemny pas z gradientowym blaskiem, duży nagłówek Ranade + minimalny przycisk outline. */
export default function ClosingCta({ fields }: { fields: ClosingCtaFields }) {
  const header = unwrap(fields.header);
  const message = unwrap(fields.message);
  const cta = unwrap(fields.cta);

  return (
    <section className="relative overflow-hidden bg-[#0f0f0f] py-24 md:py-32 font-poppins text-center text-white">
      <div className="absolute -top-24 left-1/4 h-[360px] w-[360px] rounded-full bg-[#C9AB8B]/20 blur-[120px]" />
      <div className="absolute -bottom-24 right-1/4 h-[320px] w-[320px] rounded-full bg-[#C9AB8B]/15 blur-[120px]" />

      <Container className="relative z-10 max-w-2xl">
        <h2 className="font-ranade-variable font-light text-[32px] md:text-[56px] leading-[1.1]">{header}</h2>
        {message && <p className="mt-6 text-white/65 font-light leading-relaxed text-[16px] md:text-[18px]">{message}</p>}

        {cta && (
          <div className="mt-11">
            <Link
              href={cta.href}
              className="group inline-flex items-center gap-3 rounded-full border border-white/25 px-9 py-4 text-[13px] uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-[#C9AB8B] hover:text-[#C9AB8B]"
            >
              {cta.label}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        )}
      </Container>
    </section>
  );
}
