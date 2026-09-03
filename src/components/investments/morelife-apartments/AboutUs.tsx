import { unwrap, type EditableValue } from "@/lib/editable";

type AboutUsFields = {
  eyebrow?: EditableValue<string> | string;
  headerPrefix?: EditableValue<string> | string;
  headerSuffix?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  image: EditableValue<string> | string;
};

export default function AboutUs({ fields }: { fields: AboutUsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const headerPrefix = unwrap(fields.headerPrefix);
  const headerSuffix = unwrap(fields.headerSuffix);
  const text = unwrap(fields.text);
  const image = unwrap(fields.image);

  return (
    <section id="o-inwestycji" className="bg-[#f6f5f2] text-[#1a1a1a]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-6 order-1 lg:order-1">
          {eyebrow && <p className="uppercase tracking-[0.35em] sm:tracking-[0.4em] text-[10px] sm:text-[11px] text-black/40">{eyebrow}</p>}

          <h2 className="mt-5 sm:mt-6 text-3xl sm:text-5xl lg:text-6xl font-extralight leading-[1.1] font-serif">
            {headerPrefix} <span className="font-light">{headerSuffix}</span>
          </h2>

          <div className="w-16 sm:w-20 h-[1px] bg-[#7c8c65]/40 mt-6 sm:mt-8" />

          {text && <p className="mt-8 sm:mt-10 text-black/70 text-base sm:text-lg leading-[1.7] sm:leading-[1.9] max-w-none lg:max-w-xl font-sans">{text}</p>}
        </div>

        <div className="lg:col-span-6 order-2 lg:order-2">
          <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] lg:aspect-[4/5] overflow-hidden">
            <img loading="lazy" decoding="async" src={image} alt="Luxury architectural environment" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
