import { getBreadcrumbs, getSite, toUrlPath, type Page } from "@/lib/content";

/**
 * Dane strukturalne (JSON-LD) sterowane polem "seo.structuredData" strony.
 * Czyta surowe dane z JSON-a (np. z sekcji FAQ), niezależnie od tego, czy
 * dana sekcja ma już gotowy komponent wizualny — schema i UI dzielą to
 * samo źródło prawdy, ale nie zależą od siebie nawzajem.
 */
export async function buildPageSchema(page: Page): Promise<Record<string, unknown>[]> {
  const { seoDefaults } = getSite();
  const base = seoDefaults.metadataBase;
  const entries = page.seo?.structuredData ?? [];

  const results = await Promise.all(
    entries.map((entry): Record<string, unknown> | null | Promise<Record<string, unknown> | null> => {
      switch (entry.type) {
        case "BreadcrumbList":
          return buildBreadcrumbList(page, base);
        case "WebPage":
          return buildWebPage(page, base);
        case "FAQPage":
          return buildFaqPage(page, entry.from);
        default:
          return null;
      }
    })
  );

  return results.filter((item): item is Record<string, unknown> => item !== null);
}

async function buildBreadcrumbList(page: Page, base: string) {
  const crumbs = await getBreadcrumbs(page);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: new URL(toUrlPath(crumb.href), base).toString(),
    })),
  };
}

function buildWebPage(page: Page, base: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.seo?.title || page.title,
    description: page.seo?.description,
    url: new URL(toUrlPath(page.slug), base).toString(),
  };
}

/** Wyciąga pytania/odpowiedzi z sekcji o danym id — bez wymogu, by sekcja miała już komponent. */
function buildFaqPage(page: Page, from: `section:${string}`) {
  const sectionId = from.slice("section:".length);
  const section = page.sections.find((s) => s.id === sectionId);
  const items = (section?.fields?.items ?? []) as { question: string; answer: string }[];

  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
