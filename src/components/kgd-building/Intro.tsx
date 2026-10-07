import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type IntroFields = {
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
};

/** Wstęp /kgd-building/deweloper — układ jak TextBlock w /wykonczenie-pod-klucz: nagłówek po lewej, lead po prawej za cienką linią. */
export default function Intro({ fields }: { fields: IntroFields }) {
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);

  return (
    <section id="wspolpraca" className="bg-white py-20 md:py-28 font-poppins">
      <Container>
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5">
            <span className="block h-[3px] w-14 bg-[#C9AB8B]" />
            <h2 className="mt-7 font-ranade-variable font-light text-[32px] md:text-[48px] lg:text-[54px] leading-[1.05]">{header}</h2>
          </div>
          {text && (
            <div className="lg:col-span-7 lg:border-l lg:border-black/[0.08] lg:pl-14">
              <p className="text-[19px] md:text-[23px] font-light leading-relaxed text-[#1a1a1a]">{text}</p>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
