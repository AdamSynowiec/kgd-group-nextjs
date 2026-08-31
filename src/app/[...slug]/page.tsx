import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPages, getPageBySlug, slugToSegments } from "@/lib/content";
import PageShell from "@/components/layout/PageShell";

/**
 * SILNIK PODSTRON.
 * Jedna trasa obsługuje cały serwis: skanuje src/data/pages/**.json,
 * generuje statyczne ścieżki i renderuje sekcje z rejestru.
 * Dodanie podstrony = dodanie pliku JSON. Nic tutaj nie trzeba zmieniać.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPages()
    .filter((page) => page.slug !== "/")
    .map((page) => ({ slug: slugToSegments(page.slug) }));
}

type Params = { slug: string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = getPageBySlug(`/${slug.join("/")}`);
  return page?.seo ? { title: page.seo.title, description: page.seo.description } : {};
}

export default async function ContentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = getPageBySlug(`/${slug.join("/")}`);

  if (!page) notFound();

  return <PageShell page={page} />;
}
