import type { ComponentType } from "react";

import NavBar from "./NavBar";
import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Golf from "./Golf";
import Features from "./Features";
import Apartments from "./Apartments";
import Standards from "./Standards";
import BuildStandard from "./BuildStandard";
import Investment from "./Investment";
import InvestmentOutlook from "./InvestmentOutlook";
import Gallery from "./Gallery";
import Localization from "./Localization";
import Map from "./Map";

import Deweloper from "@/components/shared/Deweloper";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";
import PrivacyPolicy from "@/components/shared/PrivacyPolicy";

/**
 * Rejestr sekcji dla szablonu "foxhills" (/inwestycja/foxhills). Wszystkie sekcje poza
 * Contact/Footer/PrivacyPolicy są zbudowane wyłącznie dla tej inwestycji (luksusowa oprawa:
 * ciemna zieleń, czerń i szampańskie złoto); Contact/Footer/PrivacyPolicy to te same globalne
 * komponenty (src/components/shared/*) co w pozostałych inwestycjach.
 */
type SectionProps = { fields: Record<string, unknown>; id?: string };

/** Globalna sekcja „KGD - Deweloper” (jak w pozostałych inwestycjach) z kotwicą dla nawigacji. */
function DeweloperSection({ fields, id }: SectionProps) {
  return (
    <div id={id ?? "deweloper"} className="scroll-mt-20 bg-white">
      <Deweloper fields={fields as React.ComponentProps<typeof Deweloper>["fields"]} />
    </div>
  );
}

const template: Record<string, ComponentType<SectionProps>> = {
  NavBar: NavBar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Golf: Golf as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  Apartments: Apartments as ComponentType<SectionProps>,
  Standards: Standards as ComponentType<SectionProps>,
  BuildStandard: BuildStandard as ComponentType<SectionProps>,
  Investment: Investment as ComponentType<SectionProps>,
  InvestmentOutlook: InvestmentOutlook as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Map: Map as ComponentType<SectionProps>,
  Deweloper: DeweloperSection,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PrivacyPolicy: PrivacyPolicy as ComponentType<SectionProps>,
};

export default template;
