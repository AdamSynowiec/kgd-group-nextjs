import type { ReactNode } from "react";
import { investmentFontVariables } from "@/lib/investments/fonts";

/**
 * Layout tylko dla stron inwestycji (/inwestycja/**). Bez SiteHeader/SiteFooter
 * z (site) — każda inwestycja renderuje własny Navbar i (współdzielony) Footer
 * jako zwykłe sekcje z rejestru, patrz src/lib/investments/sections.tsx.
 * Fonty (Ranade/Poppins/EB Garamond) są ładowane tylko tutaj, żeby nie
 * powiększać bundle'a głównej strony.
 *
 * Wymuszony jasny motyw: globals.css przełącza --background/--foreground na
 * ciemne przy prefers-color-scheme: dark, a `body` dziedziczy ten kolor
 * tekstu. Sekcje rudava-park (np. Navbar po scrollu, AboutUs na jasnym tle,
 * tabela w Apartaments) nie ustawiają własnego koloru tekstu wszędzie —
 * projekt inwestycji jest z założenia jasny, więc wypinamy tu dziedziczony
 * kolor z body zamiast dopisywać text-[#...] w każdym miejscu z osobna.
 */
export default function InvestmentLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${investmentFontVariables} bg-white text-[#171717]`} style={{ colorScheme: "light" }}>
      {children}
    </div>
  );
}
