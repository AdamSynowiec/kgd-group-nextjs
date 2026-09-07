import { unwrap, type EditableValue } from "@/lib/editable";

type Feature = { title: string; span: string; icon: string };

type FeaturesFields = {
  header?: EditableValue<string> | string;
  features?: EditableValue<Feature[]> | Feature[];
};

const icons: Record<string, string> = {
  fan: "/investments/krj307-2/icons/fan.svg",
  clima: "/investments/krj307-2/icons/clima.svg",
  heating: "/investments/krj307-2/icons/heating.svg",
  smarthome: "/investments/krj307-2/icons/smarthome.svg",
};

export default function Features({ fields }: { fields: FeaturesFields }) {
  const header = unwrap(fields.header) ?? "";
  const features = unwrap(fields.features) ?? [];

  return (
    <div
      id="udogodnienia"
      className="relative md:min-h-screen py-12 md:py-24"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.5)), url(/investments/krj307-2/features-bg.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container max-w-[1596px] mx-auto px-4 sm:px-6 lg:px-8 md:min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-12 md:min-h-screen gap-9">
          <div className="md:col-span-6 md:py-24 flex flex-col justify-center text-center md:text-left">
            <h2 className="font-poppins text-white text-4xl sm:text-5xl md:text-6xl lg:text-[85px] font-extralight max-w-[537px]">{header}</h2>
          </div>
          <div className="md:col-span-6 flex items-center">
            <div className="bg-[#FAF2E9]/[0.05] w-full md:aspect-square grid grid-cols-2 grid-rows-2">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`hover:bg-[#FAF2E9]/[0.15] transition-all flex flex-col items-center justify-center text-center border-[#FAF2E9]/[0.3] ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b" : ""}`}
                >
                  <h3 className="text-white/[.8] text-lg sm:text-xl md:text-2xl font-poppins font-base drop-shadow-md">{feature.title}</h3>
                  <img loading="lazy" decoding="async" src={icons[feature.icon]} alt={feature.title} className="my-6 w-12 sm:w-16 md:w-20" />
                  <span className="font-poppins text-[#FAF2E9] text-sm sm:text-base md:text-lg font-extralight drop-shadow-md px-4">{feature.span}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
