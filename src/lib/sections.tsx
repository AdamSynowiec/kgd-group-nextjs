import type { ComponentType } from "react";
import Section from "@/components/layout/Section";
import type { Page } from "@/lib/content";

import Hero from "@/components/sections/Hero";
import RichText from "@/components/sections/RichText";

type SectionProps = { fields: Record<string, unknown>; headingLevel?: number };

/**
 * REJESTR SEKCJI — jedyne miejsce łączące nazwę komponentu z JSON-a
 * (pole "component") z komponentem React. Nowy typ sekcji = jeden wpis tutaj.
 *
 * Rzutowanie na SectionProps jest bezpieczne: każdy komponent sekcji zawęża
 * "fields" do własnego kształtu, a JSON i tak nie jest sprawdzany typowo
 * względem tego kształtu w czasie kompilacji.
 */
const REGISTRY: Record<string, ComponentType<SectionProps>> = {
  Hero: Hero as ComponentType<SectionProps>,
  RichText: RichText as ComponentType<SectionProps>,
};

export function getSectionComponent(name: string) {
  return REGISTRY[name] ?? null;
}

/** Renderuje sekcje strony w kolejności zapisanej w JSON-ie. */
export default function SectionRenderer({ page }: { page: Page }) {
  return (
    <>
      {(page.sections || [])
        .filter((section) => section.visible !== false)
        .map((section, position) => {
          const Component = REGISTRY[section.component];

          if (!Component) {
            console.warn(
              `[sections] Nieznany komponent "${section.component}" w ${page.slug} (id: ${section.id}). Sekcja pominięta.`
            );
            return null;
          }

          const headingLevel = position === 0 ? 1 : 2;

          return (
            <Section key={section.id} id={section.id}>
              <Component fields={section.fields ?? {}} headingLevel={headingLevel} />
            </Section>
          );
        })}
    </>
  );
}
