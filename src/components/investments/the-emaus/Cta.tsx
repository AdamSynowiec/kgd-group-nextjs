import { unwrap, type EditableValue } from "@/lib/editable";

type Block = { header: string; pdfUrl: string };

type CtaFields = {
  text?: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
  blocks?: EditableValue<Block[]> | Block[];
};

export default function Cta({ fields }: { fields: CtaFields }) {
  const text = unwrap(fields.text) ?? "";
  const buttonLabel = unwrap(fields.buttonLabel) ?? "";
  const blocks = unwrap(fields.blocks) ?? [];

  return (
    <div className="bg-[#FAF2E9]">
      <div className="container max-w-[1596px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 py-12 gap-6">
        {blocks.map((block) => (
          <div key={block.header} className="text-center min-h-[300px] rounded-[50px] flex flex-col items-center justify-center gap-4 relative overflow-hidden p-10 bg-[#C2A992]">
            <div className="lg:w-2/3 relative z-10">
              <h2 className="font-poppins text-white text-2xl sm:text-5xl md:text-6xl lg:text-[54px] font-extralight mb-2">{block.header}</h2>
              <span className="text-md md:text-xl font-light leading-relaxed text-white max-w-[715px] block">{text}</span>
            </div>
            <div className="lg:w-1/3 relative z-10">
              <div className="flex lg:justify-center">
                <a href={block.pdfUrl} target="_blank" rel="noreferrer">
                  <button className="text-white uppercase font-poppins py-4 px-4 border hover:bg-white hover:text-[#C2A992] transition-all w-full md:w-auto cursor-pointer">
                    {buttonLabel}
                  </button>
                </a>
              </div>
            </div>
            <div
              className="absolute right-0 top-0 bottom-0 w-1/2 z-0 opacity-[0.1] pointer-events-none"
              style={{
                backgroundImage: "linear-gradient(to right,rgb(255, 255, 255) 10%, transparent 50%), url('/investments/the-emaus/cta-bg.webp')",
                backgroundSize: "cover",
                backgroundPosition: "center bottom",
                backgroundRepeat: "no-repeat, no-repeat",
                mixBlendMode: "multiply",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
