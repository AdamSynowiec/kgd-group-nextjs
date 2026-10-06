import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type HeroFields = {
  eyebrow?: EditableValue<string> | string;
  heading: EditableValue<string> | string;
  lead?: EditableValue<string> | string;
  bg?: EditableValue<string> | string;
};

/**
 * Hero w stylu edytorialnym stron inwestycji (duży, szczupły Ranade, układ
 * do lewej, cienka ramka narożna) — bez wideo/zdjęcia (brak jeszcze realnych
 * fotografii, patrz TODO w treści strony); pole "bg" gotowe na podmianę w
 * adminie. Wjazd tekstu przez wspólny keyframe "kgdFadeUp" (src/app/globals.css).
 */
export default function Hero({ fields }: { fields: HeroFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const heading = unwrap(fields.heading);
  const lead = unwrap(fields.lead);
  const bg = unwrap(fields.bg);

  return (
    <section className="relative min-h-[92svh] bg-[#0f0f0f] overflow-hidden font-poppins flex items-center">
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}

      <div className="absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-[#C9AB8B]/20 blur-[130px]" />
      <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-[#C9AB8B]/15 blur-[130px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.05),rgba(0,0,0,0.75))]" />

      {/* Narożna ramka — lekki, edytorialny akcent */}
      <div className="hidden md:block absolute inset-6 md:inset-10 border border-white/[0.08] pointer-events-none" />

      <Container className="relative z-10 w-full pt-[120px] pb-24 text-white">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-white/40 animate-[kgdFadeUp_0.7s_ease_forwards] opacity-0">
          <span>KGD Group — 01</span>
          <span className="hidden sm:inline">Kraków</span>
        </div>

        <div className="mt-10 h-px w-full bg-white/10 animate-[kgdFadeUp_0.8s_ease_forwards] opacity-0" />

        <div className="mt-12 max-w-4xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B] animate-[kgdFadeUp_0.9s_ease_forwards] opacity-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B]" />
              {eyebrow}
            </span>
          )}

          <h1 className="mt-5 font-ranade-variable font-light text-[44px] md:text-[80px] lg:text-[96px] leading-[1.02] animate-[kgdFadeUp_1.1s_ease_forwards] opacity-0">
            {heading}
          </h1>

          {lead && (
            <p className="mt-8 text-white/70 text-[16px] md:text-[19px] leading-relaxed font-light max-w-xl animate-[kgdFadeUp_1.3s_ease_forwards] opacity-0">
              {lead}
            </p>
          )}
        </div>

        <div className="mt-16 flex items-center gap-4 text-white/50 animate-[kgdFadeUp_1.5s_ease_forwards] opacity-0">
          <div className="relative h-14 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-4 w-px bg-[#C9AB8B] animate-bounce" />
          </div>
          <span className="text-[11px] uppercase tracking-[0.25em]">Przewiń</span>
        </div>
      </Container>
    </section>
  );
}
