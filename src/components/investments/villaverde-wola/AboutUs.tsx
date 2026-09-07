import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type AboutUsFields = {
  text?: EditableValue<string> | string;
};

export default function AboutUs({ fields }: { fields: AboutUsFields }) {
  const text = unwrap(fields.text) ?? "";

  return (
    <div className="py-[50px] lg:py-[100px] lg:pb-[100px] bg-[#1C1D21]">
      <Container>
        <p className="text-white font-ebgaramond-regular text-[26px] text-center max-w-[1200px] mx-auto">{text}</p>
      </Container>
    </div>
  );
}
