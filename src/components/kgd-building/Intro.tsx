import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type IntroFields = {
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
};

/** Krótki wstęp nagłówek+akapit — mirror pierwszego bloku Deweloper.jsx ("DLACZEGO WARTO Z NAMI WSPÓŁPRACOWAĆ?"), tylko na /kgd-building/deweloper. */
export default function Intro({ fields }: { fields: IntroFields }) {
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);

  return (
    <section id="wspolpraca" className="py-16 md:py-20 font-poppins">
      <Container className="max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-light">{header}</h2>
        {text && <p className="mt-6 text-[#4a4a4a] font-light leading-relaxed">{text}</p>}
      </Container>
    </section>
  );
}
