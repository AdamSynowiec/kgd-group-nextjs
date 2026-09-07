import { unwrap, type EditableValue } from "@/lib/editable";

type Place = { icon: string; title: string };

type LocalizationFields = {
  header?: EditableValue<string> | string;
  text1?: EditableValue<string> | string;
  text2?: EditableValue<string> | string;
  places?: EditableValue<Place[]> | Place[];
};

const icons: Record<string, string> = {
  lasekWolski: "/investments/the-emaus/icons/lasek-wolski.svg",
  kopce: "/investments/the-emaus/icons/kopce.svg",
  parkDecjusza: "/investments/the-emaus/icons/park-decjusza.svg",
  blonia: "/investments/the-emaus/icons/blonia.svg",
  zoo: "/investments/the-emaus/icons/zoo.svg",
  rudawa: "/investments/the-emaus/icons/rudawa.svg",
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const header = unwrap(fields.header) ?? "";
  const text1 = unwrap(fields.text1) ?? "";
  const text2 = unwrap(fields.text2) ?? "";
  const places = unwrap(fields.places) ?? [];

  return (
    <section id="lokalizacja" className="bg-[#FAF2E9] py-16">
      <div className="container max-w-[1596px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-0">
          <div className="lg:w-1/2 w-full flex flex-col p-4 sm:p-6 lg:p-16">
            <div className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] lg:min-h-screen">
              <img loading="lazy" decoding="async" src="/investments/the-emaus/localization.webp" alt="Lokalizacja" className="w-full h-full object-cover rounded-lg" />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center p-4 sm:p-6 lg:p-16 text-white">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extralight leading-tight mb-6">{header}</h2>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extralight leading-relaxed mb-4 sm:mb-6">{text1}</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl font-extralight leading-relaxed">{text2}</p>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 w-full flex flex-col justify-center p-4 sm:p-6 lg:p-16 text-black">
            {places.map((place, index) => (
              <div
                key={place.title}
                className={`flex flex-col sm:flex-row sm:items-center ${index !== places.length - 1 ? "border-b border-b-[#c2a992] py-4 sm:py-6" : "pt-4 sm:pt-6"}`}
              >
                <img loading="lazy" decoding="async" src={icons[place.icon]} alt={place.title} className="w-[100px] sm:w-[120px] mx-auto sm:mx-0 flex-shrink-0" />
                <h3 className="text-[#c2a992] text-xl sm:text-2xl md:text-3xl uppercase font-poppins font-extralight mt-2 sm:mt-0 sm:ml-6 text-center sm:text-left">{place.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
