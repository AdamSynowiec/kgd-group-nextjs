import type { ComponentType } from "react";
import type { Page } from "@/lib/content";

import rudavaParkTemplate from "@/components/investments/rudava-park/template";
import morelifeApartmentsTemplate from "@/components/investments/morelife-apartments/template";
import podStokiemWillaTemplate from "@/components/investments/pod-stokiem-willa/template";

type SectionProps = { fields: Record<string, unknown>; id?: string };
type Template = Record<string, ComponentType<SectionProps>>;

/**
 * REJESTR SEKCJI DLA INWESTYCJI — dwupoziomowy, mirror starego
 * src/components/templates/index.js + per-inwestycja template.js:
 * page.template (np. "rudava-park") wybiera pod-rejestr, w którym
 * section.component (np. "Hero") wskazuje właściwy komponent.
 *
 * Konieczne, bo różne inwestycje używają tych samych nazw sekcji (Hero,
 * AboutUs, Gallery, Localization, PriceHistory) z zupełnie różnymi,
 * niekompatybilnymi komponentami — płaski rejestr by kolidował.
 *
 * Bez generycznego <Section> z src/lib/sections.tsx (za bardzo "strona
 * treściowa" — border, max-w-5xl). Każdy komponent sekcji sam renderuje
 * własny <section>.
 */
const TEMPLATES: Record<string, Template> = {
  "rudava-park": rudavaParkTemplate,
  "morelife-apartments": morelifeApartmentsTemplate,
  "pod-stokiem-willa": podStokiemWillaTemplate,
};

export function getInvestmentSectionComponent(templateName: string, componentName: string) {
  return TEMPLATES[templateName]?.[componentName] ?? null;
}

export default function InvestmentSectionRenderer({ page }: { page: Page }) {
  const template = page.template ? TEMPLATES[page.template] : undefined;

  if (!template) {
    console.warn(`[investments/sections] Nieznany szablon "${page.template}" dla ${page.slug}.`);
    return null;
  }

  return (
    <>
      {(page.sections || [])
        .filter((section) => section.visible !== false)
        .map((section) => {
          const Component = template[section.component];

          if (!Component) {
            console.warn(
              `[investments/sections] Nieznany komponent "${section.component}" w szablonie "${page.template}" (${page.slug}, id: ${section.id}). Sekcja pominięta.`
            );
            return null;
          }

          return <Component key={section.id} fields={section.fields ?? {}} id={section.hashId} />;
        })}
    </>
  );
}
