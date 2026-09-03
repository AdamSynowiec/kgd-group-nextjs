import type { ComponentType } from "react";

import Navbar from "./Navbar";
import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Apartaments from "./Apartaments";
import Gallery from "./Gallery";
import Localization from "./Localization";
import Cta from "./Cta";
import PriceHistory from "./PriceHistory";

import Deweloper from "@/components/investments/shared/Deweloper";
import Contact from "@/components/investments/shared/Contact";
import Footer from "@/components/investments/shared/Footer";
import PrivacyPolicy from "@/components/investments/shared/PrivacyPolicy";

/**
 * Rejestr sekcji dla szablonu "rudava-park" — mirror starego
 * src/components/templates/rudava-park/template.js (nazwa sekcji -> komponent).
 *
 * "PhoneCall" i "Features" celowo nie mają tu wpisu — w źródłowym projekcie
 * też nie miały komponentu w template.js, więc się nie renderowały. Dane
 * tych sekcji zostają w SQL, po prostu jeszcze się nie pokazują.
 */
type SectionProps = { fields: Record<string, unknown> };

const template: Record<string, ComponentType<SectionProps>> = {
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

export default template;
