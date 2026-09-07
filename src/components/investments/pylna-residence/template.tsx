import type { ComponentType } from "react";

import Navbar from "./Navbar";
import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Offert from "./Offert";
import Localization from "./Localization";
import Gallery from "./Gallery";
import PriceHistory from "./PriceHistory";

import Deweloper from "@/components/shared/Deweloper";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";

/**
 * Rejestr sekcji dla szablonu "pylna-residence" — mirror starego
 * src/components/templates/pylna-residence/template.js.
 *
 * "HousePlanMap" celowo nie ma tu wpisu — w źródłowym projekcie też nie miał
 * komponentu w template.js (fields: {} i tak puste), więc się nie renderował.
 */
type SectionProps = { fields: Record<string, unknown> };

const template: Record<string, ComponentType<SectionProps>> = {
  Navbar: Navbar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Offert: Offert as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  PriceHistory: PriceHistory as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
};

export default template;
