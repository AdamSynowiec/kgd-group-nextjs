import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";

type Panel = { bg: string; header: string; text: string; link: string };

type OfferPanelsFields = {
  eyebrow?: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
  panels?: EditableValue<Panel[]> | Panel[];
};

/**
 * Jedyna sekcja strony "/kgd-building" — dwa panele "na pół ekranu" w stylu
 * Hero ze strony głównej: zdjęcie z powolnym zoomem, ciemny gradient,
 * złota kreska, duży nagłówek Ranade i przycisk-pigułka ze strzałką.
 */
export default function OfferPanels({ fields }: { fields: OfferPanelsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const buttonLabel = unwrap(fields.buttonLabel);
  const panels = unwrap(fields.panels) ?? [];

  return (
    <section className="relative grid grid-cols-1 md:grid-cols-2 bg-[#0f0f0f] font-poppins">
      {panels.map((panel, index) => (
        <Link key={panel.link} href={panel.link} className="group relative block overflow-hidden h-[75svh] md:h-svh">
          <img
            src={panel.bg}
            alt=""
            loading={index === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/55 transition-colors duration-500 group-hover:from-black/90" />
          <div className="absolute -bottom-32 -left-32 h-[360px] w-[360px] rounded-full bg-[#C9AB8B]/15 blur-[120px] pointer-events-none" />
          <div className="hidden md:block absolute inset-6 md:inset-10 border border-white/[0.08] pointer-events-none transition-colors duration-500 group-hover:border-[#C9AB8B]/40" />

          <div className="relative z-10 flex h-full flex-col justify-end px-8 pb-14 md:px-16 md:pb-24 text-white">
            <span className="font-ranade-variable font-thin text-[72px] md:text-[110px] leading-none text-white/[0.12] select-none transition-colors duration-500 group-hover:text-[#C9AB8B]/40">
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="mt-4 block h-[3px] w-14 bg-[#C9AB8B] transition-all duration-500 group-hover:w-24" />

            {eyebrow && <span className="mt-6 text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B]">{eyebrow}</span>}

            <h2 className="mt-4 max-w-xl font-ranade-variable font-light text-[32px] sm:text-[40px] md:text-[52px] leading-[1.08]">{panel.header}</h2>

            <p className="mt-5 max-w-lg text-[16px] md:text-[18px] font-light leading-relaxed text-white/75">{panel.text}</p>

            {buttonLabel && (
              <span className="mt-8 inline-flex w-fit items-center gap-4 rounded-full border border-white/30 pl-7 pr-2 py-2 text-[13px] uppercase tracking-[0.2em] transition-colors duration-300 group-hover:border-[#C9AB8B] group-hover:text-[#C9AB8B]">
                {buttonLabel}
                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-white text-[#141414] transition-all duration-300 group-hover:bg-[#C9AB8B] group-hover:text-white group-hover:translate-x-1">
                  →
                </span>
              </span>
            )}
          </div>
        </Link>
      ))}
    </section>
  );
}
