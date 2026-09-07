import { unwrap, type EditableValue } from "@/lib/editable";

type LocalizationFields = {
  header?: EditableValue<string> | string;
  text1?: EditableValue<string> | string;
  text2?: EditableValue<string> | string;
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const header = unwrap(fields.header) ?? "";
  const text1 = unwrap(fields.text1) ?? "";
  const text2 = unwrap(fields.text2) ?? "";

  return (
    <section id="lokalizacja" className="bg-[#FAF2E9] py-16">
      <div className="container max-w-[1596px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-stretch">
          <div className="w-full flex relative">
            <img loading="lazy" decoding="async" src="/investments/krj307-2/localization.webp" alt="Mapa lokalizacji" className="w-full h-full object-cover" />
            <div className="bg-white p-4 rounded-br-[30px] rounded-tr-[30px] absolute left-0 -bottom-[24px]">
              <img loading="lazy" decoding="async" src="/investments/krj307-2/logo-dark.svg" alt="" className="max-w-[150px] z-10 relative" />
              <div className="bg-white w-screen bottom-0 top-0 absolute right-20 z-0" />
            </div>
          </div>

          <div className="bg-[#C2A992] text-white p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-6">{header}</h2>
            <p className="text-lg md:text-xl font-light leading-relaxed mb-6">{text1}</p>
            <p className="text-lg md:text-xl font-light leading-relaxed">{text2}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
