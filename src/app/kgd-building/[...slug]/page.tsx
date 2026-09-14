import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPages, getPageBySlug, slugToSegments } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { buildPageSchema } from "@/lib/schema";
import JsonLd from "@/components/seo/JsonLd";
import KgdBuildingSectionRenderer from "@/lib/kgd-building/sections";

/**
 * Podstrony "/kgd-building/*" (deweloper, indywidualna) — mirror
 * src/app/inwestycja/[...slug]/page.tsx. Goły "/kgd-building" ma WŁASNY plik
 * (../page.tsx), więc tu wystarczy prefiks + "/".
 */
const PREFIX = "/kgd-building";

export const dynamicParams = false;

export async function generateStaticParams() {
  const pages = await getAllPages();

  return pages
    .filter((page) => page.slug.startsWith(`${PREFIX}/`))
    .map((page) => ({ slug: slugToSegments(page.slug.slice(PREFIX.length)) }));
}

type Params = { slug: string[] };

async function loadPage(slug: string[]) {
  return getPageBySlug(`${PREFIX}/${slug.join("/")}`);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  return page ? buildMetadata(page) : {};
}

export default async function KgdBuildingSubPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = await loadPage(slug);

  if (!page) notFound();

  const schema = await buildPageSchema(page);

  return (
    <>
      <JsonLd data={schema} />
      <KgdBuildingSectionRenderer page={page} />
    </>
  );
}
