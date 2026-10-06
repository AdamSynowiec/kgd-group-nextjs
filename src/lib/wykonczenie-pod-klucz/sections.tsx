import type { ComponentType } from "react";
import type { Page } from "@/lib/content";

import wykonczeniePodKluczTemplate from "@/components/wykonczenie-pod-klucz/template";

type SectionProps = { fields: Record<string, unknown> };
type Template = Record<string, ComponentType<SectionProps>>;

/**
 * REJESTR SEKCJI DLA RODZINY "WYKONCZENIE-POD-KLUCZ" — mirror
 * src/lib/kgd-building/sections.tsx (dwupoziomowy: page.template -> section.component).
 */
const TEMPLATES: Record<string, Template> = {
  "wykonczenie-pod-klucz": wykonczeniePodKluczTemplate,
};

export default function WykonczeniePodKluczSectionRenderer({ page }: { page: Page }) {
  const template = page.template ? TEMPLATES[page.template] : undefined;

  if (!template) {
    console.warn(`[wykonczenie-pod-klucz/sections] Nieznany szablon "${page.template}" dla ${page.slug}.`);
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
              `[wykonczenie-pod-klucz/sections] Nieznany komponent "${section.component}" w szablonie "${page.template}" (${page.slug}, id: ${section.id}). Sekcja pominięta.`
            );
            return null;
          }

          return <Component key={section.id} fields={section.fields ?? {}} />;
        })}
    </>
  );
}
