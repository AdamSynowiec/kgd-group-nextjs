import { unwrap, type EditableValue } from "@/lib/editable";

type MapFields = {
  header?: EditableValue<string> | string;
};

/** W tej inwestycji "Map" to statyczny obraz (mapa-emaus.webp), nie Leaflet — jak w oryginalnym Map.jsx. */
export default function Map({ fields }: { fields: MapFields }) {
  const header = unwrap(fields.header) ?? "";

  return (
    <section id="udogodnienia">
      <div className="bg-[#C2A992]">
        <div className="container max-w-[1596px] mx-auto px-6">
          <div className="grid grid-cols-12">
            <div className="col-span-12 py-12 md:py-24 text-center">
              <h2 className="font-poppins text-white text-4xl md:text-5xl lg:text-[65px] font-extralight mb-12 md:mb-24">{header}</h2>
              <img loading="lazy" decoding="async" src="/investments/the-emaus/map.webp" alt="" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
