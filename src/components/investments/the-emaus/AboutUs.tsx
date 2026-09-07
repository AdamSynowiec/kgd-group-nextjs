import { unwrap, type EditableValue } from "@/lib/editable";

type AboutUsFields = {
  header?: EditableValue<string> | string;
  text1?: EditableValue<string> | string;
  text2?: EditableValue<string> | string;
};

export default function AboutUs({ fields }: { fields: AboutUsFields }) {
  const header = unwrap(fields.header) ?? "";
  const text1 = unwrap(fields.text1) ?? "";
  const text2 = unwrap(fields.text2) ?? "";

  return (
    <section id="o_inwestycji">
      <div className="relative overflow-hidden">
        <div className="grid grid-cols-12 w-full h-full absolute -z-10">
          <div className="col-span-12 md:col-span-9 bg-[#FAF2E9]" />
          <div className="col-span-12 md:col-span-3 bg-white" />
        </div>
        <div className="md:bg-transparent bg-[#FAF2E9] container max-w-[1596px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 flex flex-col items-start justify-center text-center md:text-left">
              <h2 className="font-poppins text-[#856F5B] text-3xl sm:text-4xl md:text-5xl lg:text-[65px] font-extralight max-w-[537px] mb-6">{header}</h2>
              <p className="font-poppins text-[#313131] font-extralight max-w-[715px] text-lg md:text-xl">
                {text1}
                <br />
                <br />
                {text2}
              </p>
            </div>
            <div className="md:col-span-6 relative flex flex-col items-center md:items-start justify-center">
              <img loading="lazy" decoding="async" src="/investments/the-emaus/aboutus.webp" alt="" className="w-full max-w-[777px] h-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
