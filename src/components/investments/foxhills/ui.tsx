"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Wspólne prymitywy Fox Hills Residences — zgodne z księgą znaku.
 *
 * Paleta: #171A1C (główne ciemne tło), #26292B (alternatywne ciemne), #F7F7F7 (najjaśniejsze tło),
 * #E7E7E7 (logo i nagłówki na ciemnym), #BCC0C1 (akapity na ciemnym, srebrny akcent), #555859 (teksty pomocnicze na jasnym).
 * Typografia: DM Serif Display (nagłówki, hasła, cytaty), Manrope (akapity i podpisy).
 */

/** Liczby: DM Serif Display ma czytelne, "lining" cyfry. */
export const NUM = "font-dmserif [font-variant-numeric:lining-nums]";

/** Srebrny gradient tekstu (wariant metaliczny) — używany oszczędnie. */
export const metalText = "bg-gradient-to-r from-[#F7F7F7] via-[#BCC0C1] to-[#F7F7F7] bg-clip-text text-transparent";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1920px] px-6 sm:px-10 lg:px-16 2xl:px-24 ${className}`}>{children}</div>;
}

/** Wjazd elementu przy przewijaniu — jeden, spójny ruch dla całej strony. */
export function Reveal({ children, delay = 0, y = 28, className = "" }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Nadtytuł: złote kapitaliki z cienką linią po obu stronach. */
export function Eyebrow({ children, align = "left", tone = "dark", className = "" }: { children: ReactNode; align?: "left" | "center"; tone?: "dark" | "light"; className?: string }) {
  const line = tone === "dark" ? "#BCC0C1" : "#555859";
  return (
    <div className={`flex items-center gap-4 ${align === "center" ? "justify-center" : ""} ${className}`}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent" style={{ backgroundImage: `linear-gradient(to right, transparent, ${line})` }} />
      <span className="font-manrope text-[11px] font-medium uppercase tracking-[0.42em]" style={{ color: line }}>{children}</span>
      {align === "center" && <span className="h-px w-10" style={{ backgroundImage: `linear-gradient(to left, transparent, ${line})` }} />}
    </div>
  );
}

/** Ozdobnik: linia – romb – linia. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#BCC0C1]/70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-[#BCC0C1]" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#BCC0C1]/70" />
    </div>
  );
}

/** Nagłówek sekcji: nadtytuł + duży nagłówek Melodrama + kursywny akcent + opis. */
export function SectionHeader({
  eyebrow,
  title,
  accent,
  text,
  tone = "dark",
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  accent?: string;
  text?: string;
  tone?: "dark" | "light";
  align?: "left" | "center";
  className?: string;
}) {
  const center = align === "center";
  return (
    <Reveal className={`${center ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && <Eyebrow align={align} tone={tone}>{eyebrow}</Eyebrow>}
      <h2
        className={`mt-6 font-dmserif text-[38px] font-medium leading-[1.05] tracking-[-0.01em] sm:text-[52px] lg:text-[64px] ${
          tone === "dark" ? "text-[#E7E7E7]" : "text-[#171A1C]"
        }`}
      >
        {title}
        {accent && (
          <span className={`mt-1 block font-dmserif text-[0.78em] font-light italic tracking-normal ${tone === "dark" ? "text-[#BCC0C1]" : "text-[#555859]"}`}>{accent}</span>
        )}
      </h2>
      {text && (
        <p
          className={`mt-7 max-w-2xl font-manrope text-[15px] font-light leading-[1.9] sm:text-[16px] ${center ? "mx-auto" : ""} ${
            tone === "dark" ? "text-[#E7E7E7]/65" : "text-[#171A1C]/65"
          }`}
        >
          {text}
        </p>
      )}
    </Reveal>
  );
}

type ButtonProps = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "gold" | "outline" | "ghost-dark";
  className?: string;
  type?: "button" | "submit";
  external?: boolean;
  download?: boolean;
};

/** Przycisk: ostre narożniki, złota ramka, połysk przesuwający się po najechaniu. */
export function Button({ href, onClick, children, variant = "gold", className = "", type = "button", external, download }: ButtonProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-3 overflow-hidden px-8 py-4 font-manrope text-[11px] font-medium uppercase tracking-[0.3em] transition-all duration-500";
  const tone =
    variant === "gold"
      ? "bg-gradient-to-br from-[#F7F7F7] via-[#BCC0C1] to-[#8E9396] text-[#171A1C] shadow-[0_10px_40px_-10px_rgba(188,192,193,0.6)] hover:shadow-[0_14px_50px_-8px_rgba(231,231,231,0.7)]"
      : variant === "outline"
        ? "border border-[#BCC0C1]/60 text-[#E7E7E7] hover:border-[#E7E7E7] hover:bg-[#BCC0C1]/10"
        : "border border-[#171A1C]/30 text-[#171A1C] hover:border-[#555859] hover:text-[#555859]";

  const inner = (
    <>
      {variant === "gold" && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[120%] bg-white/40 blur-md transition-transform duration-700 group-hover:translate-x-[320%]" />
      )}
      <span className="relative flex items-center gap-3">{children}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={`${base} ${tone} ${className}`} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...(download ? { download: true } : {})}>
        {inner}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={`${base} ${tone} ${className}`}>
      {inner}
    </button>
  );
}

/**
 * Logo Fox Hills Residences (księga znaku): "light" — jasne na ciemnym, "dark" — ciemne na jasnym,
 * "metal" — wariant z subtelnym srebrnym połyskiem (logo jako maska, gradient przesuwa się powoli).
 * Minimalna szerokość na ekranie: 180 px (pole ochronne = szerokość litery „F” — zapewnia otaczający układ).
 */
export function Logo({ variant = "light", className = "", label = "Fox Hills Residences" }: { variant?: "light" | "dark" | "metal"; className?: string; label?: string }) {
  if (variant === "metal") {
    return <span role="img" aria-label={label} className={`fh-metal-logo fh-motion block aspect-[2213/788] ${className}`} />;
  }
  return (
    <img
      src={`/investments/foxhills/logo-${variant === "dark" ? "ciemne" : "jasne"}.svg`}
      alt={label}
      width={2213}
      height={788}
      decoding="async"
      className={`block h-auto ${className}`}
    />
  );
}
