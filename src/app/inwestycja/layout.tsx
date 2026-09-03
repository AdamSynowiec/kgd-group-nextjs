import type { ReactNode } from "react";
import { investmentFontVariables } from "@/lib/fonts";

/**
 * Layout tylko dla stron inwestycji (/inwestycja/**). Bez SiteHeader/SiteFooter
 * z (site) — każda inwestycja renderuje własny Navbar i (współdzielony) Footer
 * jako zwykłe sekcje z rejestru, patrz src/lib/investments/sections.tsx.
 * Fonty (Ranade/Poppins/EB Garamond/...) są ładowane tylko tutaj, żeby nie
 * powiększać bundle'a głównej strony.
 */
export default function InvestmentLayout({ children }: { children: ReactNode }) {
  return <div className={investmentFontVariables}>{children}</div>;
}
