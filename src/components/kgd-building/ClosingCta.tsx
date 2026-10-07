import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type ClosingCtaFields = {
  message: EditableValue<string> | string;
  buttonLabel: EditableValue<string> | string;
  phone: EditableValue<string> | string;
};

/** Zamykająca sekcja — ciemny pas ze złotym blaskiem (jak ClosingCta w /wykonczenie-pod-klucz); komunikat + przycisk z numerem telefonu. */
export default function ClosingCta({ fields }: { fields: ClosingCtaFields }) {
  const message = unwrap(fields.message);
  const buttonLabel = unwrap(fields.buttonLabel);
  const phone = unwrap(fields.phone);

  return (
    <section className="relative overflow-hidden bg-[#0f0f0f] py-24 md:py-32 font-poppins text-center text-white">
      <div className="absolute -top-24 left-1/4 h-[360px] w-[360px] rounded-full bg-[#C9AB8B]/20 blur-[120px]" />
      <div className="absolute -bottom-24 right-1/4 h-[320px] w-[320px] rounded-full bg-[#C9AB8B]/15 blur-[120px]" />

      <Container className="relative z-10 max-w-3xl">
        <h2 className="font-ranade-variable font-light text-[28px] md:text-[46px] leading-[1.15]">{message}</h2>

        {phone && (
          <div className="mt-11">
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="group inline-flex items-center gap-3 rounded-full border border-white/25 px-9 py-4 text-[13px] uppercase tracking-[0.2em] text-white transition-all duration-300 hover:border-[#C9AB8B] hover:text-[#C9AB8B]"
            >
              {buttonLabel} {phone}
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
          </div>
        )}
      </Container>
    </section>
  );
}
