import type { ComponentType } from "react";

import NavBar from "./NavBar";
import Hero from "./Hero";
import Intro from "./Intro";
import OfferPanels from "./OfferPanels";
import WhyUs from "./WhyUs";
import Features from "./Features";
import Projects from "./Projects";
import Process from "./Process";
import Benefits from "./Benefits";
import Knowledge from "./Knowledge";
import Timeline from "./Timeline";
import ServiceAreas from "./ServiceAreas";
import FeatureImage from "./FeatureImage";
import ClosingCta from "./ClosingCta";

import Deweloper from "@/components/shared/Deweloper";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";

/**
 * Rejestr sekcji dla rodziny "kgd-building" (/kgd-building, /kgd-building/deweloper,
 * /kgd-building/indywidualna) — mirror src/components/investments/rudava-park/template.tsx.
 * Jeden płaski rejestr (nie dwupoziomowy jak w src/lib/investments/sections.tsx),
 * bo — inaczej niż inwestycje — wszystkie strony tej rodziny dzielą JEDEN
 * szablon wizualny ("kgd-building"), więc nie ma kolizji nazw sekcji do
 * rozstrzygania per-strona.
 *
 * "Deweloper"/"Contact"/"Footer" — te same, naprawdę globalne komponenty co w
 * każdej inwestycji (src/components/shared/*), nie duplikaty.
 */
type SectionProps = { fields: Record<string, unknown> };

const template: Record<string, ComponentType<SectionProps>> = {
  NavBar: NavBar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  Intro: Intro as ComponentType<SectionProps>,
  OfferPanels: OfferPanels as ComponentType<SectionProps>,
  WhyUs: WhyUs as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  Projects: Projects as ComponentType<SectionProps>,
  Process: Process as ComponentType<SectionProps>,
  Benefits: Benefits as ComponentType<SectionProps>,
  Knowledge: Knowledge as ComponentType<SectionProps>,
  Timeline: Timeline as ComponentType<SectionProps>,
  ServiceAreas: ServiceAreas as ComponentType<SectionProps>,
  FeatureImage: FeatureImage as ComponentType<SectionProps>,
  ClosingCta: ClosingCta as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
};

export default template;
