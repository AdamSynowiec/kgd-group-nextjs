import { unwrap, type EditableValue } from "@/lib/editable";

type ProspectusButton = { label: string; url: string };

type CtaFields = {
  standardHeader?: EditableValue<string> | string;
  standardText?: EditableValue<string> | string;
  standardPdfUrl?: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
  prospectusHeader?: EditableValue<string> | string;
  prospectusText?: EditableValue<string> | string;
  prospectusButtons?: EditableValue<ProspectusButton[]> | ProspectusButton[];
};

export default function Cta({ fields }: { fields: CtaFields }) {
  const standardHeader = unwrap(fields.standardHeader) ?? "";
  const standardText = unwrap(fields.standardText) ?? "";
  const standardPdfUrl = unwrap(fields.standardPdfUrl) ?? "";
  const buttonLabel = unwrap(fields.buttonLabel) ?? "";
  const prospectusHeader = unwrap(fields.prospectusHeader) ?? "";
  const prospectusText = unwrap(fields.prospectusText) ?? "";
  const prospectusButtons = unwrap(fields.prospectusButtons) ?? [];

  const bgStyle: React.CSSProperties = {
    backgroundImage: "linear-gradient(to right,rgb(255, 255, 255) 10%, transparent 50%), url('/investments/krj307-2/cta-bg.webp')",
    backgroundSize: "cover",
    backgroundPosition: "center bottom",
    backgroundRepeat: "no-repeat, no-repeat",
    mixBlendMode: "multiply",
  };

  return (
    <div className="bg-[#FAF2E9]">
      <div className="container max-w-[1596px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 py-12 gap-6">
        <div className="text-center min-h-[300px] rounded-[50px] flex flex-col items-center justify-center gap-4 relative overflow-hidden p-10 bg-[#C2A992]">
          <div className="lg:w-2/3 relative z-10">
            <h2 className="font-poppins text-white text-2xl sm:text-5xl md:text-6xl lg:text-[54px] font-extralight mb-2">{standardHeader}</h2>
            <span className="text-md md:text-xl font-light leading-relaxed text-white max-w-[715px] block">{standardText}</span>
          </div>
          <div className="lg:w-1/3 relative z-10">
            <div className="flex lg:justify-center">
              <a href={standardPdfUrl} target="_blank" rel="noreferrer">
                <button className="text-white uppercase font-poppins py-4 px-4 border hover:bg-white hover:text-[#C2A992] transition-all w-full md:w-auto cursor-pointer">
                  {buttonLabel}
                </button>
              </a>
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 z-0 opacity-[0.1] pointer-events-none" style={bgStyle} />
        </div>

        <div className="text-center min-h-[300px] rounded-[50px] flex flex-col items-center justify-center gap-4 relative overflow-hidden p-10 bg-[#C2A992]">
          <div className="lg:w-2/3 relative z-10">
            <h2 className="font-poppins text-white text-2xl sm:text-5xl md:text-6xl lg:text-[54px] font-extralight mb-2">{prospectusHeader}</h2>
            <span className="text-md md:text-xl font-light leading-relaxed text-white max-w-[715px] block">{prospectusText}</span>
          </div>
          <div className="w-full relative z-10">
            <div className="flex flex-row justify-center gap-[24px]">
              {prospectusButtons.map((btn) => (
                <a key={btn.label} href={btn.url} target="_blank" rel="noreferrer">
                  <button className="w-full text-white uppercase font-poppins py-4 px-4 border hover:bg-white hover:text-[#C2A992] transition-all md:w-auto cursor-pointer">
                    {btn.label}
                  </button>
                </a>
              ))}
            </div>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 z-0 opacity-[0.1] pointer-events-none" style={bgStyle} />
        </div>
      </div>
    </div>
  );
}
