import { unwrap, type EditableValue } from "@/lib/editable";

type LocFeature = { title: string; text: string };

type LocalizationFields = {
  eyebrow?: EditableValue<string> | string;
  headerPrefix?: EditableValue<string> | string;
  headerSuffix?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  features?: EditableValue<LocFeature[]> | LocFeature[];
  mapImage: EditableValue<string> | string;
  mapCaption?: EditableValue<string> | string;
};

export default function Localization({ fields }: { fields: LocalizationFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const headerPrefix = unwrap(fields.headerPrefix);
  const headerSuffix = unwrap(fields.headerSuffix);
  const text = unwrap(fields.text);
  const features = unwrap(fields.features) ?? [];
  const mapImage = unwrap(fields.mapImage);
  const mapCaption = unwrap(fields.mapCaption);

  return (
    <section id="lokalizacja" className="bg-[#f6f5f2] text-[#1a1a1a]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-28">
        <div className="max-w-3xl">
          {eyebrow && <p className="uppercase tracking-[0.35em] text-[10px] sm:text-[11px] text-[#7c8c65]">{eyebrow}</p>}

          <h2 className="mt-5 sm:mt-6 text-3xl sm:text-5xl lg:text-6xl font-extralight leading-[1.1] font-serif">
            {headerPrefix} <span className="font-light">{headerSuffix}</span>
          </h2>

          <div className="w-16 sm:w-20 lg:w-24 h-[1px] bg-[#7c8c65]/40 mt-6 sm:mt-8" />

          {text && <p className="mt-6 sm:mt-8 text-black/70 leading-[1.7] sm:leading-[1.9] text-sm sm:text-base lg:text-lg">{text}</p>}
        </div>

        <div className="mt-12 sm:mt-14 lg:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          {features.map((item) => (
            <div key={item.title} className="border-l-2 border-[#7c8c65]/40 pl-5 sm:pl-6">
              <p className="uppercase tracking-[0.3em] text-[10px] sm:text-[11px] text-[#7c8c65]">{item.title}</p>
              <p className="mt-3 sm:mt-4 text-black/60 text-sm sm:text-base leading-[1.6] sm:leading-[1.8]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full mt-16 sm:mt-20 lg:mt-24">
        <div className="relative w-full">
          <img loading="lazy" decoding="async" src={mapImage} alt="Mapa lokalizacji" className="w-full h-full object-contain sm:object-cover" />

          {mapCaption && (
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 bg-[#f6f5f2]/90 px-4 sm:px-6 py-2 sm:py-3 border border-black/10">
              <p className="text-[10px] sm:text-[11px] tracking-[0.3em] text-black/60 uppercase">{mapCaption}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
