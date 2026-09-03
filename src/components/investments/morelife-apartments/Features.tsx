import { unwrap, type EditableValue } from "@/lib/editable";

type FeatureItem = { icon: "fan" | "cooler" | "heat" | "ai"; title: string; description: string };

type FeaturesFields = {
  bg: EditableValue<string> | string;
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  features?: EditableValue<FeatureItem[]> | FeatureItem[];
};

const icons: Record<FeatureItem["icon"], string> = {
  fan: "/investments/morelife-apartments/icons/icon-fan.svg",
  heat: "/investments/morelife-apartments/icons/icon-heat.svg",
  ai: "/investments/morelife-apartments/icons/icon-ai.svg",
  cooler: "/investments/morelife-apartments/icons/icon-cooler.svg",
};

export default function Features({ fields }: { fields: FeaturesFields }) {
  const bg = unwrap(fields.bg);
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const features = unwrap(fields.features) ?? [];

  return (
    <section className="relative overflow-hidden text-[#f6f5f2]">
      <img loading="lazy" decoding="async" src={bg} className="absolute inset-0 w-full h-full object-cover" alt="" />

      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,140,101,0.18),transparent_65%)]" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28 relative z-10">
        <div className="max-w-2xl">
          {eyebrow && <p className="uppercase tracking-[0.35em] text-[10px] sm:text-[11px] text-white/50">{eyebrow}</p>}

          <h2 className="mt-5 sm:mt-6 text-3xl sm:text-5xl lg:text-6xl font-extralight leading-[1.1] font-serif">{header}</h2>

          <div className="w-16 sm:w-20 h-[1px] bg-[#7c8c65]/50 mt-6 sm:mt-8" />
        </div>

        <div className="mt-12 sm:mt-14 lg:mt-16 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((item) => (
            <div
              key={item.title}
              className="group relative p-6 sm:p-8 lg:p-10 border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-all duration-300 hover:-translate-y-[2px]"
            >
              <div className="flex flex-col items-start gap-4 sm:gap-5">
                <div className="flex items-center justify-center w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto text-[#7c8c65] shrink-0">
                  <img loading="lazy" decoding="async" src={icons[item.icon]} alt={item.title} />
                </div>

                <div className="text-center sm:text-left w-full">
                  <h3 className="text-sm sm:text-base font-light tracking-wide text-white">{item.title}</h3>
                  <p className="mt-2 sm:mt-3 text-white/70 text-sm sm:text-base leading-[1.7] sm:leading-[1.8]">{item.description}</p>
                  <div className="w-0 group-hover:w-14 sm:group-hover:w-16 h-[1px] bg-[#7c8c65]/60 mt-4 sm:mt-5 transition-all duration-500" />
                </div>
              </div>

              <div className="absolute inset-0 border border-[#7c8c65]/0 group-hover:border-[#7c8c65]/20 transition-all duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
