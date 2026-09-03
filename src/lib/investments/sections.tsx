import type { ComponentType } from "react";
import type { Page } from "@/lib/content";

import Navbar from "@/components/investments/rudava-park/Navbar";
import Hero from "@/components/investments/rudava-park/Hero";
import AboutUs from "@/components/investments/rudava-park/AboutUs";
import Apartaments from "@/components/investments/rudava-park/Apartaments";
import Gallery from "@/components/investments/rudava-park/Gallery";
import Localization from "@/components/investments/rudava-park/Localization";
import Cta from "@/components/investments/rudava-park/Cta";
import PriceHistory from "@/components/investments/rudava-park/PriceHistory";

import Deweloper from "@/components/investments/shared/Deweloper";
import Contact from "@/components/investments/shared/Contact";
import Footer from "@/components/investments/shared/Footer";
import PrivacyPolicy from "@/components/investments/shared/PrivacyPolicy";

type SectionProps = { fields: Record<string, unknown> };

/**
 * REJESTR SEKCJI DLA INWESTYCJI — mirror src/lib/sections.tsx, ale bez
 * generycznego <Section> (za bardzo "strona treściowa" — border, max-w-5xl).
 * Każdy komponent sekcji sam renderuje własny <section>.
 *
 * "PhoneCall" i "Features" celowo nie mają tu wpisu — w źródłowym projekcie
 * (kgd-group-deweloper) te sekcje też nie miały komponentu w template.js,
 * więc się nie renderowały. Dane tych sekcji zostają w SQL (patrz reguła o
 * niepomijaniu danych), po prostu żadna z inwestycji jeszcze ich nie pokazuje.
 */
const REGISTRY: Record<string, ComponentType<SectionProps>> = {
  Navbar: Navbar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Apartaments: Apartaments as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Cta: Cta as ComponentType<SectionProps>,
  PriceHistory: PriceHistory as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PrivacyPolicy: PrivacyPolicy as ComponentType<SectionProps>,
};

export function getInvestmentSectionComponent(name: string) {
  return REGISTRY[name] ?? null;
}

export default function InvestmentSectionRenderer({ page }: { page: Page }) {
  return (
    <>
      {(page.sections || [])
        .filter((section) => section.visible !== false)
        .map((section) => {
          const Component = REGISTRY[section.component];

          if (!Component) {
            console.warn(`[investments/sections] Nieznany komponent "${section.component}" w ${page.slug} (id: ${section.id}). Sekcja pominięta.`);
            return null;
          }

          return <Component key={section.id} fields={section.fields ?? {}} />;
        })}
    </>
  );
}
