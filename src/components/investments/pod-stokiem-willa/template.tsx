import type { ComponentType } from "react";

import Navbar from "./Navbar";
import Hero from "./Hero";
import SectionHeader from "./SectionHeader";
import Separator from "./Separator";
import BigImageSection from "./BigImageSection";
import FeaturesIcon from "./FeaturesIcon";
import Features from "./Features";
import Offert from "./Offert";
import Gallery from "./Gallery";
import Map from "./Map";

import Deweloper from "@/components/investments/shared/Deweloper";
import Contact from "@/components/investments/shared/Contact";
import Footer from "@/components/investments/shared/Footer";
import PrivacyPolicy from "@/components/investments/shared/PrivacyPolicy";

/**
 * Rejestr sekcji dla szablonu "pod-stokiem-willa" — mirror starego
 * src/components/templates/pod-stokiem-willa/template.js.
 */
type SectionProps = { fields: Record<string, unknown>; id?: string };

const template: Record<string, ComponentType<SectionProps>> = {
  Navbar: Navbar as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  SectionHeader: SectionHeader as ComponentType<SectionProps>,
  Separator: Separator as ComponentType<SectionProps>,
  BigImageSection: BigImageSection as ComponentType<SectionProps>,
  FeaturesIcon: FeaturesIcon as ComponentType<SectionProps>,
  Features: Features as ComponentType<SectionProps>,
  Offert: Offert as ComponentType<SectionProps>,
  Gallery: Gallery as ComponentType<SectionProps>,
  Map: Map as ComponentType<SectionProps>,
  Deweloper: Deweloper as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
  PrivacyPolicy: PrivacyPolicy as ComponentType<SectionProps>,
};

export default template;
