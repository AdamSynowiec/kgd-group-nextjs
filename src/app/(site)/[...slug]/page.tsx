import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPages, getPageBySlug, slugToSegments } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import PageShell from "@/components/layout/PageShell";

/**
 * SILNIK PODSTRON.
 * Jedna trasa obsługuje resztę serwisu: pyta backend/ (PHP + MySQL) o listę
 * stron i o treść po slugu, generuje statyczne ścieżki i renderuje sekcje z
 * rejestru. Dodanie podstrony = dodanie wiersza w tabeli `pages`. Nic tutaj
 * nie trzeba zmieniać.
 *
 * WYJĄTEK: "/blog" i jego dzieci — mają WŁASNĄ trasę (src/app/blog/**),
 * poza grupą (site), bo blog dostaje inny layout (NavBar/Contact/Footer
 * identyczne jak na stronie głównej, nie generyczny SiteHeader/SiteFooter —
 * patrz src/app/blog/layout.tsx). Bez tego wyjątku ta trasa próbowałaby
 * wygenerować te same adresy drugi raz, tyle że z niewłaściwym layoutem —
 * konkretna ścieżka plikowa (src/app/blog/...) i tak zawsze wygrywa przy
 * routingu Next.js, ale to marnowałoby build (niepotrzebne zapytania o
 * treść blogowych stron w tej pętli) i myliło, skąd tak naprawdę pochodzi
 * wygenerowany /blog.
 */

export const dynamicParams = false;

function isBlogSlug(slug: string): boolean {
  return slug === "/blog" || slug.startsWith("/blog/");
}

export async function generateStaticParams() {
  const pages = await getAllPages();

  return pages.filter((page) => page.slug !== "/" && !isBlogSlug(page.slug)).map((page) => ({ slug: slugToSegments(page.slug) }));
}

type Params = { slug: string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const fullSlug = `/${slug.join("/")}`;
  if (isBlogSlug(fullSlug)) return {};

  const page = await getPageBySlug(fullSlug);
  return page ? buildMetadata(page) : {};
}

export default async function ContentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const fullSlug = `/${slug.join("/")}`;
  if (isBlogSlug(fullSlug)) notFound();

  const page = await getPageBySlug(fullSlug);

  if (!page) notFound();

  return <PageShell page={page} />;
}
