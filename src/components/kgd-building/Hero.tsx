"use client";

import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import { SocialIcon, ChevronDownIcon } from "./icons";

type Social = { href: string; label: string; icon: string };

type HeroFields = {
  bg?: EditableValue<string> | string;
  video?: EditableValue<boolean> | boolean;
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  scrollTo?: EditableValue<string> | string;
  scrollLabel?: EditableValue<string> | string;
  socials?: EditableValue<Social[]> | Social[];
};

const VIDEO_SRC = "/kgd-building/hero-bg.mp4";

/**
 * Mirror kgd-building/Hero.jsx (stary projekt) — wideo w tle (z fallbackiem
 * na obraz, gdy "video" wyłączone, patrz Deweloper Hero bez wideo) + scroll
 * CTA + social linki. Ścieżka wideo zahardkodowana (nie pole "asset") — mirror
 * src/components/investments/krj307-2/Hero.tsx: AssetEditor.tsx obsługuje
 * tylko podgląd/upload obrazów (accept="image/*"), więc plik wideo jak każdy
 * inny "stały" zasób marki idzie wprost w kodzie; "video" jest zwykłym
 * przełącznikiem bool, nie ścieżką.
 */
export default function Hero({ fields }: { fields: HeroFields }) {
  const bg = unwrap(fields.bg);
  const video = unwrap(fields.video);
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const scrollTo = unwrap(fields.scrollTo);
  const scrollLabel = unwrap(fields.scrollLabel);
  const socials = unwrap(fields.socials) ?? [];

  return (
    <section className="relative min-h-svh bg-slate-900 overflow-hidden font-poppins">
      {video ? (
        <video className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline preload="auto" poster={bg}>
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      ) : (
        bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.2),rgba(0,0,0,0.78))]" />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 min-h-svh flex flex-col justify-center text-white">
        <div className="md:max-w-[70%]">
          <h1 className="text-[34px] md:text-[58px] leading-tight font-light mb-6 animate-[kgdFadeUp_1s_ease_forwards] opacity-0">
            {header}
          </h1>
          {subHeader && (
            <p className="text-white/85 text-[17px] md:text-[24px] leading-relaxed font-light md:max-w-[50vw] animate-[kgdFadeUp_1.2s_ease_forwards] opacity-0">
              {subHeader}
            </p>
          )}
        </div>

        <div className="absolute bottom-[40px] left-6 right-6 flex items-end justify-between">
          {scrollTo ? (
            <a href={scrollTo} className="group flex flex-col items-center gap-3 text-white/70 hover:text-white transition-colors">
              {scrollLabel && <span className="text-[11px] uppercase tracking-[0.18em] opacity-70">{scrollLabel}</span>}
              <div className="w-[42px] h-[42px] rounded-full border border-white/15 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:bg-white/10 group-hover:translate-y-1">
                <ChevronDownIcon />
              </div>
            </a>
          ) : (
            <span />
          )}

          {socials.length > 0 && (
            <ul className="flex items-center gap-3">
              {socials.map((social) => (
                <li key={social.label}>
                  <Link
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="w-[46px] h-[46px] rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl flex items-center justify-center text-white/80 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    <SocialIcon icon={social.icon} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
