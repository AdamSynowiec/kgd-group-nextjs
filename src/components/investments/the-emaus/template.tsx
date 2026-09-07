import type { ComponentType } from "react";

import NavBar from "./NavBar";
import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Features from "./Features";
import Apartaments from "./Apartaments";
import Cta from "./Cta";
import Localization from "./Localization";
import Map from "./Map";
import Gallery from "./Gallery";
import PriceHistory from "./PriceHistory";

import Deweloper from "@/components/shared/Deweloper";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";

/** Rejestr sekcji dla szablonu "the-emaus" — mirror starego src/components/templates/the-emaus/template.js. */
type SectionProps = { fields: Record<string, unknown>; id?: string };

const template: Record<string, ComponentType<SectionProps>> = {
  NavBar: NavBar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  Apartaments: Apartaments as ComponentType<SectionProps>,
  Cta: Cta as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Map: Map as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PriceHistory: PriceHistory as ComponentType<SectionProps>,
};

export default template;
