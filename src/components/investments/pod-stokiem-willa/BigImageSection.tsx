import { unwrap, type EditableValue } from "@/lib/editable";
import H2 from "./H2";
import P from "./P";

type BigImageSectionFields = {
  image: { url: string };
  header?: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
};

export default function BigImageSection({ fields }: { fields: BigImageSectionFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);

  return (
    <div className="relative min-h-svh bg-cover bg-center" style={{ backgroundImage: `url(${fields.image?.url})` }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(42, 42, 42, 0.6) 50%, rgba(0, 0, 0, 0) 100%)" }}
      />

      <div className="relative z-10 flex flex-col justify-center h-full">
        <div className="min-h-svh flex flex-col items-center justify-center max-w-[1158px] text-center mx-auto">
          {header && <H2 className="text-white">{header}</H2>}
          {subHeader && <P className="text-white">{subHeader}</P>}
        </div>
      </div>
    </div>
  );
}
