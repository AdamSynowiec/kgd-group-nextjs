import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { buildPageSchema } from "@/lib/schema";
import JsonLd from "@/components/seo/JsonLd";
import KgdBuildingSectionRenderer from "@/lib/kgd-building/sections";

/**
 * Strona "/kgd-building" (bez segmentów) — osobny plik od [...slug]/page.tsx,
 * mirror rozdziału src/app/page.tsx ("/") vs src/app/(site)/[...slug]/page.tsx:
 * [...slug] (bez podwójnych nawiasów) wymaga co najmniej jednego segmentu,
 * więc goły indeks rodziny potrzebuje własnej trasy.
 */
const SLUG = "/kgd-building";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(SLUG);
  return page ? buildMetadata(page) : {};
}

export default async function KgdBuildingIndexPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const schema = await buildPageSchema(page);

  return (
    <>
      <JsonLd data={schema} />
      <KgdBuildingSectionRenderer page={page} />
    </>
  );
}
