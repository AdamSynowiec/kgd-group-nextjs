import type { ComponentType } from "react";

import NavBar from "./NavBar";
import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Features from "./Features";
import Offert from "./Offert";
import Localization from "./Localization";
import Gallery from "./Gallery";
import PriceHistory from "./PriceHistory";

import Deweloper from "@/components/investments/shared/Deweloper";
import Contact from "@/components/investments/shared/Contact";
import Footer from "@/components/investments/shared/Footer";

/**
 * Rejestr sekcji dla szablonu "morelife-apartments" — mirror starego
 * src/components/templates/morelife-apartments/template.js.
 *
 * "Cta" ma w JSON puste fields i nie miała komponentu w starym template.js —
 * zostaje bez wpisu, jak w źródle (sekcja się nie renderowała).
 * "FeaturesIcon"/"Map"/"BigImageSection" nie są portowane — w starym
 * template.js były importowane, ale nigdy nie trafiły do eksportowanego
 * rejestru, więc nigdy się nie renderowały (dead code).
 */
type SectionProps = { fields: Record<string, unknown> };

const template: Record<string, ComponentType<SectionProps>> = {
  NavBar: NavBar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  Offert: Offert as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  PriceHistory: PriceHistory as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
};

export default template;
