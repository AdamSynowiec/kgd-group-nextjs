import type { ComponentType } from "react";
import type { Page } from "@/lib/content";

import HomePage from "@/components/home/HomePage";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";

/**
 * Rejestr sekcji dla strony głównej — mirror src/lib/investments/sections.tsx,
 * ale dla jednej, unikalnej strony ("/", template "kgd-group") zamiast wielu
 * inwestycji. Bez generycznego <Section> z src/lib/sections.tsx (border,
 * max-w-5xl) — HomePage ma własny, pełnoekranowy design.
 */
type SectionProps = { fields: Record<string, unknown> };

const REGISTRY: Record<string, ComponentType<SectionProps>> = {
  HomePage: HomePage as ComponentType<SectionProps>,
  Contact: Contact as ComponentType<SectionProps>,
  Footer: Footer as ComponentType<SectionProps>,
};

export default function HomeSectionRenderer({ page }: { page: Page }) {
  return (
    <>
      {(page.sections || [])
        .filter((section) => section.visible !== false)
        .map((section) => {
          const Component = REGISTRY[section.component];

          if (!Component) {
            console.warn(`[home/sections] Nieznany komponent "${section.component}" (${page.slug}, id: ${section.id}). Sekcja pominięta.`);
            return null;
          }

          return <Component key={section.id} fields={section.fields ?? {}} />;
        })}
    </>
  );
}
