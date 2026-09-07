import { unwrap, type EditableValue } from "@/lib/editable";

type Feature = { title: string; span: string; icon: string };

type FeaturesFields = {
  header?: EditableValue<string> | string;
  features?: EditableValue<Feature[]> | Feature[];
};

const icons: Record<string, string> = {
  fan: "/investments/the-emaus/icons/bezpieczenstwo.svg",
  clima: "/investments/the-emaus/icons/zielen.svg",
  heating: "/investments/the-emaus/icons/inteligentny-dom.svg",
  smarthome: "/investments/the-emaus/icons/lokalizacja.svg",
};

export default function Features({ fields }: { fields: FeaturesFields }) {
  const header = unwrap(fields.header) ?? "";
  const features = unwrap(fields.features) ?? [];

  return (
    <div
      className="relative md:min-h-screen py-12 md:py-24"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5)), url(/investments/the-emaus/features-bg.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container max-w-[1596px] mx-auto px-4 sm:px-6 lg:px-8 md:min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 md:min-h-screen gap-9">
          <div className="md:col-span-12 md:py-24 flex flex-col justify-center text-center md:text-left">
            <h2 className="text-center font-poppins text-white text-4xl sm:text-5xl md:text-6xl lg:text-[85px] font-extralight">{header}</h2>
          </div>
          <div className="md:col-span-12">
            <div className="bg-[#FAF2E9]/[0.05] w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
              {features.map((feature) => (
                <div key={feature.title} className="hover:bg-[#FAF2E9]/[0.15] transition-all flex flex-col items-center justify-start text-center border-[#FAF2E9]/[0.3] p-6">
                  <img loading="lazy" decoding="async" src={icons[feature.icon]} alt={feature.title} className="my-4 h-[80px] md:h-[160px]" />
                  <h3 className="text-white/[.8] text-lg sm:text-xl md:text-2xl font-poppins font-base drop-shadow-md">{feature.title}</h3>
                  <span className="font-poppins text-[#FAF2E9] text-sm sm:text-base md:text-lg font-extralight drop-shadow-md px-2">{feature.span}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
