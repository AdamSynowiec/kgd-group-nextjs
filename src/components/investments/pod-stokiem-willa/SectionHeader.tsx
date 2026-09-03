import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import H2 from "./H2";
import P from "./P";

type SectionHeaderFields = {
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
};

export default function SectionHeader({ fields, id }: { fields: SectionHeaderFields; id?: string }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);

  return (
    <div id={id} className="py-[50px] lg:py-[100px] bg-[#F6F6F6]">
      <Container>
        <H2 className="mb-[24px]">{header}</H2>
        {subHeader && <P>{subHeader}</P>}
      </Container>
    </div>
  );
}
