import type { ComponentType } from "react";

import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Feature from "./Feature";
import Houses from "./Houses";
import Gallery from "./Gallery";
import Localization from "./Localization";
import Cta from "./Cta";
import PriceHistory from "./PriceHistory";

import Deweloper from "@/components/shared/Deweloper";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";

/**
 * Rejestr sekcji dla szablonu "villaverde-wola" — mirror starego
 * src/components/templates/villaverde-wola/template.js.
 *
 * "PrivacyPolicy" celowo nie ma tu wpisu — w źródłowym projekcie ta strona
 * (polityka-prywatnosci) odwołuje się do komponentu, którego template.js
 * villaverde-wola NIGDY nie importował (brak wpisu w starym template.js,
 * mimo że plik danych istnieje) — sekcja się tam nie renderowała, więc nie
 * renderuje się i tutaj. Dane (treść HTML) zostają zapisane w SQL.
 * Analogicznie brak osobnego "Navbar" — w źródle nawigacja jest wbudowana w Hero.jsx.
 */
type SectionProps = { fields: Record<string, unknown>; id?: string };

const template: Record<string, ComponentType<SectionProps>> = {
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Feature: Feature as ComponentType<SectionProps>,
  Houses: Houses as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Cta: Cta as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PriceHistory: PriceHistory as ComponentType<SectionProps>,
};

export default template;
