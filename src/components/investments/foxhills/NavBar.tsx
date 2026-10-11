"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Button, Logo } from "./ui";

type NavItem = { name: string; path: string };

type NavBarFields = {
  menu?: EditableValue<NavItem[]> | NavItem[];
  phone?: EditableValue<string> | string;
  ctaLabel?: EditableValue<string> | string;
  ctaHref?: EditableValue<string> | string;
};

/** Logo inwestycji (wspólne dla paska i menu mobilnego) — szerokość zawsze ≥ 180 px (księga znaku). */
function Wordmark({ compact }: { compact: boolean }) {
  return (
    <a href="#top" aria-label="Fox Hills Residences — początek strony" className="block flex-none">
      <Logo variant="light" className={`transition-all duration-500 ${compact ? "w-[180px]" : "w-[180px] md:w-[210px]"}`} />
    </a>
  );
}

/**
 * Nawigacja inwestycji FOXHILLS (standard KGD: menu z kotwicami + telefon, plus przycisk CTA).
 * Przezroczysta nad hero, po przewinięciu ciemny szklany pasek; aktywna sekcja podświetlona złotą
 * linią (scroll-spy). Na telefonie pełnoekranowe menu z płynnym wjazdem pozycji.
 */
export default function NavBar({ fields }: { fields: NavBarFields }) {
  const menu = unwrap(fields.menu) ?? [];
  const phone = unwrap(fields.phone) ?? "";
  const ctaLabel = unwrap(fields.ctaLabel);
  const ctaHref = unwrap(fields.ctaHref) ?? "#kontakt";

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: sekcja, której środek ekranu aktualnie dotyka, staje się aktywną pozycją menu.
  useEffect(() => {
    const ids = menu.map((item) => item.path).filter((path) => path.startsWith("#") && path.length > 1).map((path) => path.slice(1));
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(`#${entry.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.length]);

  // Blokada przewijania strony pod otwartym menu + zamknięcie klawiszem Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled ? "border-b border-[#BCC0C1]/20 bg-[#171A1C]/95 py-3 backdrop-blur-xl" : "bg-gradient-to-b from-black/70 via-black/25 to-transparent py-5 md:py-7"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1920px] items-center justify-between gap-8 px-6 sm:px-10 lg:px-16 2xl:px-24">
          <Wordmark compact={scrolled} />

          <nav aria-label="Nawigacja inwestycji" className="hidden items-center gap-6 xl:flex 2xl:gap-9">
            {menu.map((item) => {
              const isActive = active === item.path;
              return (
                <a
                  key={item.name}
                  href={item.path}
                  className={`group relative whitespace-nowrap py-2 font-manrope text-[11px] font-light uppercase tracking-[0.24em] transition-colors duration-300 ${
                    isActive ? "text-[#E7E7E7]" : "text-[#E7E7E7]/80 hover:text-[#E7E7E7]"
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-[#BCC0C1] transition-transform duration-500 ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                  />
                </a>
              );
            })}
          </nav>

          <div className="hidden items-center gap-5 xl:flex 2xl:gap-7">
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} aria-label={`Zadzwoń: ${phone}`} className="flex items-center gap-2.5 whitespace-nowrap font-manrope text-[13px] font-light tracking-wider text-[#E7E7E7] transition-colors hover:text-[#E7E7E7]">
                <Icon name="phone" className="h-[18px] w-[18px] text-[#BCC0C1]" />
                <span className="hidden 2xl:inline">{phone}</span>
              </a>
            )}
            {ctaLabel && (
              <Button href={ctaHref} variant="outline" className="!whitespace-nowrap !px-5 !py-3 2xl:!px-6">
                {ctaLabel}
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Otwórz menu"
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center border border-[#BCC0C1]/40 text-[#E7E7E7] transition-colors hover:border-[#E7E7E7] xl:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            key="fh-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#171A1C] xl:hidden"
          >
            <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#BCC0C1]/15 blur-[120px]" />
            <div className="relative flex items-center justify-between px-6 py-5 sm:px-10">
              <Wordmark compact />
              <button type="button" onClick={() => setOpen(false)} aria-label="Zamknij menu" className="flex h-11 w-11 items-center justify-center border border-[#BCC0C1]/40 text-[#E7E7E7]">
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <nav className="relative flex flex-1 flex-col justify-center gap-1 px-8 sm:px-14">
              {menu.map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.path}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + index * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex items-baseline gap-5 border-b border-[#BCC0C1]/15 py-4"
                >
                  <span className="font-manrope text-[11px] tracking-[0.3em] text-[#BCC0C1]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-dmserif text-[30px] font-medium tracking-wide text-[#E7E7E7] transition-colors group-hover:text-[#E7E7E7] sm:text-[38px]">{item.name}</span>
                </motion.a>
              ))}
            </nav>

            <div className="relative flex flex-col gap-4 px-8 pb-10 sm:px-14">
              {phone && (
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className="flex items-center gap-3 font-manrope text-lg font-light tracking-wider text-[#E7E7E7]">
                  <Icon name="phone" className="h-5 w-5 text-[#BCC0C1]" />
                  {phone}
                </a>
              )}
              {ctaLabel && (
                <Button href={ctaHref} variant="gold" onClick={() => setOpen(false)}>
                  {ctaLabel}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
