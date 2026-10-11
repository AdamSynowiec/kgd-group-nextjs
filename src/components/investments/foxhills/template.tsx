import type { ComponentType } from "react";

import NavBar from "./NavBar";
import Hero from "./Hero";
import AboutUs from "./AboutUs";
import Features from "./Features";
import Apartments from "./Apartments";
import Standards from "./Standards";
import Gallery from "./Gallery";
import Localization from "./Localization";
import Map from "./Map";
import Developer from "./Developer";

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

const template: Record<string, ComponentType<SectionProps>> = {
  NavBar: NavBar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  AboutUs: AboutUs as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  Apartments: Apartments as ComponentType<SectionProps>,
  Standards: Standards as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  Localization: Localization as ComponentType<SectionProps>,
  Map: Map as ComponentType<SectionProps>,
  Developer: Developer as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PrivacyPolicy: PrivacyPolicy as ComponentType<SectionProps>,
};

export default template;
