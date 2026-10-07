import type { ComponentType } from "react";

import NavBarMinimal from "./NavBarMinimal";
import Hero from "./Hero";
import Marquee from "./Marquee";
import Highlights from "./Highlights";
import FeatureImage from "./FeatureImage";
import TextBlock from "./TextBlock";
import FeatureGrid from "./FeatureGrid";
import Steps from "./Steps";
import Faq from "./Faq";
import ClosingCta from "./ClosingCta";

import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";

/**
 * Rejestr sekcji dla szablonu "wykonczenie-pod-klucz" (/wykonczenie-pod-klucz) —
 * mirror src/components/kgd-building/template.tsx. "Contact"/"Footer" — te
 * same, naprawdę globalne komponenty co w każdej inwestycji (src/components/shared/*).
 */
type SectionProps = { fields: Record<string, unknown> };

const template: Record<string, ComponentType<SectionProps>> = {
  NavBarMinimal: NavBarMinimal as ComponentType<SectionProps>,
  Hero: Hero as ComponentType<SectionProps>,
  Marquee: Marquee as ComponentType<SectionProps>,
  Highlights: Highlights as ComponentType<SectionProps>,
  FeatureImage: FeatureImage as ComponentType<SectionProps>,
  TextBlock: TextBlock as ComponentType<SectionProps>,
  FeatureGrid: FeatureGrid as ComponentType<SectionProps>,
  Steps: Steps as ComponentType<SectionProps>,
  Faq: Faq as ComponentType<SectionProps>,
  ClosingCta: ClosingCta as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
};

export default template;
