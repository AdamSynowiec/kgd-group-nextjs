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
import PrivacyPolicy from "@/components/shared/PrivacyPolicy";

/**
 * Rejestr sekcji dla szablonu "villaverde-wola" — mirror starego
 * src/components/templates/villaverde-wola/template.js.
 *
 * "PrivacyPolicy" JEST zarejestrowana (poprawka 2026-09-14): porównanie z
 * aktualnie żywym kgd-group.pl pokazało, że /inwestycja/villaverde-wola/polityka-prywatnosci
 * faktycznie renderuje pełną treść na produkcji — wcześniejsze założenie
 * "stary template.js nigdy tego nie importował" nie odzwierciedlało już
 * stanu żywej strony. Dane w db/inwestycje/villaverde-wola.sql poprawione
 * przy okazji na kształt title+blocks (patrz PrivacyPolicy.tsx), zgodny z
 * pozostałymi inwestycjami — wcześniej były zapisane jako surowy HTML
 * ("content"), którego ten komponent i tak nigdy nie czyta.
 * Brak osobnego "Navbar" pozostaje bez zmian — w źródle nawigacja jest
 * wbudowana w Hero.jsx.
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
  PrivacyPolicy: PrivacyPolicy as ComponentType<SectionProps>,
};

export default template;
