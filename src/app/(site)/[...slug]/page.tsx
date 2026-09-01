import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPages, getPageBySlug, slugToSegments } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import PageShell from "@/components/layout/PageShell";

/**
 * SILNIK PODSTRON.
 * Jedna trasa obsługuje cały serwis: pyta backend/ (PHP + MySQL) o listę stron
 * i o treść po slugu, generuje statyczne ścieżki i renderuje sekcje z rejestru.
 * Dodanie podstrony = dodanie wiersza w tabeli `pages`. Nic tutaj nie trzeba zmieniać.
 */

export const dynamicParams = false;

export async function generateStaticParams() {
  const pages = await getAllPages();

  return pages.filter((page) => page.slug !== "/").map((page) => ({ slug: slugToSegments(page.slug) }));
}

type Params = { slug: string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(`/${slug.join("/")}`);
  return page ? buildMetadata(page) : {};
}

export default async function ContentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = await getPageBySlug(`/${slug.join("/")}`);

  if (!page) notFound();

  return <PageShell page={page} />;
}
