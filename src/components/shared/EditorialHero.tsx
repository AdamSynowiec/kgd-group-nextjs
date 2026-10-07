import type { ReactNode } from "react";

export type HeroSocial = { href: string; label: string; icon: ReactNode };

type EditorialHeroProps = {
  heading: string;
  lead?: string;
  eyebrow?: string;
  video?: string;
  poster?: string;
  scrollTo?: string;
  scrollLabel?: string;
  socials?: HeroSocial[];
};

/**
 * Wspólny Hero strony głównej i /wykonczenie-pod-klucz — jeden komponent, żeby
 * oba miejsca wyglądały identycznie. Wideo w tle (z posterem), ciemne gradienty
 * + złoty blask, cienka ramka narożna, duży nagłówek Ranade wyrównany do lewej.
 * Kontener 1596px = ten sam co w home/NavBar.tsx, żeby tekst trzymał linię z logo.
 * Wymaga font-ranade-variable w drzewie (homeFontVariables / investmentFontVariables).
 */
export default function EditorialHero({ heading, lead, eyebrow, video, poster, scrollTo, scrollLabel = "Przewiń", socials = [] }: EditorialHeroProps) {
  const scrollCue = (
    <>
      <span className="relative block h-14 w-px overflow-hidden bg-white/15">
        <span className="absolute inset-x-0 top-0 h-4 w-px bg-[#C9AB8B] animate-bounce" />
      </span>
      <span className="text-[11px] uppercase tracking-[0.25em]">{scrollLabel}</span>
    </>
  );

  return (
    <section className="relative min-h-svh bg-[#0f0f0f] overflow-hidden font-poppins flex items-center">
      {video ? (
        <video className="absolute inset-0 w-full h-full object-cover pointer-events-none" autoPlay muted loop playsInline preload="auto" poster={poster}>
          <source src={video} type="video/mp4" />
        </video>
      ) : (
        poster && <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.25),rgba(0,0,0,0.8))]" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
      <div className="absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-[#C9AB8B]/20 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-[#C9AB8B]/15 blur-[130px] pointer-events-none" />

      <div className="hidden md:block absolute inset-6 md:inset-10 border border-white/[0.08] pointer-events-none" />

      <div className="container max-w-[1596px] mx-auto px-6 relative z-10 w-full pt-[120px] md:pt-[210px] pb-24 text-white">
        <div className="flex items-center justify-end text-[11px] uppercase tracking-[0.25em] text-white/40 animate-[kgdFadeUp_0.7s_ease_forwards] opacity-0">
          <span className="hidden sm:inline">Kraków</span>
        </div>

        <div className="mt-10 h-px w-full bg-white/10 animate-[kgdFadeUp_0.8s_ease_forwards] opacity-0" />

        <div className="mt-12 max-w-5xl">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B] animate-[kgdFadeUp_0.9s_ease_forwards] opacity-0">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B]" />
              {eyebrow}
            </span>
          )}

          <h1 className="mt-5 font-ranade-variable font-light text-[40px] md:text-[72px] lg:text-[88px] leading-[1.02] animate-[kgdFadeUp_1.1s_ease_forwards] opacity-0">
            {heading}
          </h1>

          {lead && (
            <p className="mt-8 text-white/75 text-[16px] md:text-[19px] leading-relaxed font-light max-w-2xl animate-[kgdFadeUp_1.3s_ease_forwards] opacity-0">
              {lead}
            </p>
          )}
        </div>

        <div className="mt-16 flex items-end justify-between gap-6 animate-[kgdFadeUp_1.5s_ease_forwards] opacity-0">
          {scrollTo ? (
            <a href={scrollTo} className="flex items-center gap-4 text-white/50 hover:text-white transition-colors">
              {scrollCue}
            </a>
          ) : (
            <div className="flex items-center gap-4 text-white/50">{scrollCue}</div>
          )}

          {socials.length > 0 && (
            <ul className="flex items-center gap-3">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-[48px] h-[48px] rounded-full border border-white/15 flex items-center justify-center text-white/70 transition-all duration-500 hover:-translate-y-1 hover:border-[#C9AB8B] hover:text-[#C9AB8B]"
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
