import type { Metadata } from "next";
import { getSite, normalizeSlug, type Page } from "@/lib/content";

/**
 * Buduje next/Metadata z bloku "seo" strony, spadając na seoDefaults z site.json,
 * gdy strona nie poda własnej wartości. Ścieżki (canonical, obrazy) są względne —
 * Next rozwiązuje je względem metadataBase automatycznie.
 */
export function buildMetadata(page: Page): Metadata {
  const { seoDefaults } = getSite();
  const seo = page.seo ?? {};

  const title = seo.title || seoDefaults.title;
  const description = seo.description || seoDefaults.description;
  const canonical = seo.canonical || normalizeSlug(page.slug);
  const ogImage = seo.ogImage || seoDefaults.ogImage;

  return {
    metadataBase: new URL(seoDefaults.metadataBase),
    title,
    description,
    keywords: seo.keywords,
    authors: [{ name: seo.author || seoDefaults.author || seoDefaults.siteName }],
    alternates: { canonical },
    robots: {
      index: seo.robots?.index ?? true,
      follow: seo.robots?.follow ?? true,
    },
    openGraph: {
      title: seo.ogTitle || title,
      description: seo.ogDescription || description,
      url: seo.ogUrl || canonical,
      siteName: seo.ogSiteName || seoDefaults.siteName,
      locale: seo.ogLocale || seoDefaults.ogLocale,
      type: seo.ogType || "website",
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: seo.twitterCard || "summary_large_image",
      title: seo.twitterTitle || title,
      description: seo.twitterDescription || description,
      images: seo.twitterImage || ogImage ? [seo.twitterImage || ogImage!] : undefined,
      site: seoDefaults.twitterSite || undefined,
    },
  };
}
