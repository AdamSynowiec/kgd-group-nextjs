import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type CtaFields = {
  phone?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
};

export default function Cta({ fields }: { fields: CtaFields }) {
  const phone = unwrap(fields.phone) ?? "";
  const text = unwrap(fields.text) ?? "";

  return (
    <div className="py-[50px] lg:py-[100px] bg-[#1C1D21]">
      <Container>
        <div className="flex flex-col items-center justify-center text-center">
          <img loading="lazy" decoding="async" src="/investments/villaverde-wola/logo2.svg" alt="" />
          <h2 className="text-[#C8A35F] font-ebgaramond-regular text-[32px] lg:text-[64px] py-[24px]">
            <a href={`tel:${phone}`}>{phone}</a>
          </h2>
          <p className="font-ebgaramond-regular text-[#FCFCFC] text-[26px] text-center max-w-[1200px] mx-auto">{text}</p>
        </div>
      </Container>
    </div>
  );
}
