import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type ClosingCtaFields = {
  message: EditableValue<string> | string;
  buttonLabel: EditableValue<string> | string;
  phone: EditableValue<string> | string;
};

/** Mirror zamykającej sekcji Deweloper.jsx (nagłówek + pas CTA z numerem telefonu). */
export default function ClosingCta({ fields }: { fields: ClosingCtaFields }) {
  const message = unwrap(fields.message);
  const buttonLabel = unwrap(fields.buttonLabel);
  const phone = unwrap(fields.phone);

  return (
    <section className="font-poppins">
      <Container className="py-16 md:py-20 text-center">
        <p className="text-xl md:text-2xl font-extralight max-w-3xl mx-auto">{message}</p>
      </Container>

      {phone && (
        <div className="bg-[#C9AB8B] py-10 flex justify-center">
          <a
            href={`tel:${phone.replace(/\s+/g, "")}`}
            className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white text-[#1a1a1a] font-light tracking-wide transition-all duration-300 hover:bg-transparent hover:text-white border border-white"
          >
            {buttonLabel} {phone}
          </a>
        </div>
      )}
    </section>
  );
}
