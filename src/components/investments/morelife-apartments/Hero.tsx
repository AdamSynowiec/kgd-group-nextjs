import { unwrap, type EditableValue } from "@/lib/editable";

type HeroFields = {
  bg: EditableValue<string> | string;
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  primaryButtonLabel?: EditableValue<string> | string;
  secondaryButtonLabel?: EditableValue<string> | string;
};

export default function Hero({ fields }: { fields: HeroFields }) {
  const bg = unwrap(fields.bg);
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const primaryButtonLabel = unwrap(fields.primaryButtonLabel);
  const secondaryButtonLabel = unwrap(fields.secondaryButtonLabel);

  return (
    <section className="relative w-full min-h-screen overflow-hidden">
      <img loading="eager" fetchPriority="high" decoding="async" src={bg} alt="Morelife Apartments Kraków" className="absolute inset-0 w-full h-full object-cover scale-105" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent" />

      <div className="relative z-10 min-h-screen flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 lg:py-32">
          {eyebrow && <p className="uppercase tracking-[0.35em] text-[10px] sm:text-[11px] text-white/60 mb-6 sm:mb-8">{eyebrow}</p>}

          <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-extralight leading-[1.5] md:leading-[1.07] text-white font-serif mb-6 sm:mb-8 whitespace-pre-line">
            {header}
          </h1>

          {subHeader && <p className="text-white/90 text-sm sm:text-base lg:text-lg max-w-xl leading-[1.7] sm:leading-[1.8] mb-8 sm:mb-10">{subHeader}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            {primaryButtonLabel && (
              <a
                href="#apartamenty"
                className="inline-flex justify-center px-7 sm:px-8 py-3 bg-[#7c8c65] text-white uppercase tracking-[0.2em] text-[10px] sm:text-[11px] hover:bg-[#6d7b58] transition w-full sm:w-auto"
              >
                {primaryButtonLabel}
              </a>
            )}

            {secondaryButtonLabel && (
              <a
                href="#kontakt"
                className="text-white font-medium px-4 py-2 border border-white/30 rounded-full bg-white/5 hover:bg-white/10 hover:border-white/60 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 w-full sm:w-auto text-center"
              >
                {secondaryButtonLabel}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
