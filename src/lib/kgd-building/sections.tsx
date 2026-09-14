import type { ComponentType } from "react";
import type { Page } from "@/lib/content";

import kgdBuildingTemplate from "@/components/kgd-building/template";

type SectionProps = { fields: Record<string, unknown> };
type Template = Record<string, ComponentType<SectionProps>>;

/**
 * REJESTR SEKCJI DLA RODZINY "KGD BUILDING" — mirror src/lib/investments/sections.tsx
 * (dwupoziomowy: page.template -> section.component), zachowany dla spójności
 * z resztą projektu mimo że dziś jest tu tylko jeden klucz — patrz komentarz
 * w src/components/kgd-building/template.tsx.
 */
const TEMPLATES: Record<string, Template> = {
  "kgd-building": kgdBuildingTemplate,
};

export default function KgdBuildingSectionRenderer({ page }: { page: Page }) {
  const template = page.template ? TEMPLATES[page.template] : undefined;

  if (!template) {
    console.warn(`[kgd-building/sections] Nieznany szablon "${page.template}" dla ${page.slug}.`);
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
              `[kgd-building/sections] Nieznany komponent "${section.component}" w szablonie "${page.template}" (${page.slug}, id: ${section.id}). Sekcja pominięta.`
            );
            return null;
          }

          return <Component key={section.id} fields={section.fields ?? {}} />;
        })}
    </>
  );
}
