import type { ReactNode } from "react";
import { investmentFontVariables } from "@/lib/fonts";
import { getPageBySlug } from "@/lib/content";
import CallToUs from "@/components/shared/CallToUs";

/**
 * Layout tylko dla stron inwestycji (/inwestycja/**). Bez SiteHeader/SiteFooter
 * z (site) — każda inwestycja renderuje własny Navbar i (współdzielony) Footer
 * jako zwykłe sekcje z rejestru, patrz src/lib/investments/sections.tsx.
 * Fonty (Ranade/Poppins/EB Garamond/...) są ładowane tylko tutaj, żeby nie
 * powiększać bundle'a głównej strony.
 *
 * CallToUs (pływający przycisk "szybki telefon") NIE jest duplikowany w
 * treści każdej inwestycji (inaczej niż Contact/Footer) — czytany raz stąd
 * ze strony głównej ("/"), tak jak w src/app/blog/layout.tsx. Jedno miejsce
 * edycji w panelu dla całego serwisu.
 */
export default async function InvestmentLayout({ children }: { children: ReactNode }) {
  const homePage = await getPageBySlug("/");
  const callToUsSection = homePage?.sections.find((section) => section.component === "CallToUs");

  return (
    <div className={investmentFontVariables}>
      {children}
      {callToUsSection && <CallToUs fields={callToUsSection.fields ?? {}} />}
    </div>
  );
}
