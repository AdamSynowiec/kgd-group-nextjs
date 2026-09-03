import type { ComponentType } from "react";

import NavBar from "./NavBar";
import Hero from "./Hero";
import Features from "./Features";
import AboutUs from "./AboutUs";
import Apartaments from "./Apartaments";
import Localization from "./Localization";
import Gallery from "./Gallery";
import PriceHistory from "./PriceHistory";

import Deweloper from "@/components/investments/shared/Deweloper";
import Contact from "@/components/investments/shared/Contact";
import Footer from "@/components/investments/shared/Footer";
import PrivacyPolicy from "@/components/investments/shared/PrivacyPolicy";

/**
 * Rejestr sekcji dla szablonu "pod-stokiem-apartamenty" — mirror starego
 * src/components/templates/pod-stokiem-apartamenty/template.js.
 *
 * "InwestMap" i "Cta" celowo nie mają tu wpisu — w źródłowym projekcie też
 * nie miały komponentu w template.js, więc się nie renderowały. Dane tych
 * sekcji zostają w SQL.
 */
type SectionProps = { fields: Record<string, unknown> };

const template: Record<string, ComponentType<SectionProps>> = {
  NavBar: NavBar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Apartaments: Apartaments as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  PriceHistory: PriceHistory as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PrivacyPolicy: PrivacyPolicy as ComponentType<SectionProps>,
};

export default template;
