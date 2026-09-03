import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPages, getPageBySlug, slugToSegments } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { buildPageSchema } from "@/lib/schema";
import JsonLd from "@/components/seo/JsonLd";
import InvestmentSectionRenderer from "@/lib/investments/sections";

/**
 * SILNIK STRON INWESTYCJI. Mirror src/app/(site)/[...slug]/page.tsx, ale bez
 * generycznego PageShell/Section (te są stylowane pod strony treściowe) —
 * każda inwestycja renderuje swoje sekcje przez własny rejestr, patrz
 * src/lib/investments/sections.tsx. Dodanie inwestycji = dodanie wierszy w
 * tabeli `pages` (slug zaczynający się od "/inwestycja/") + rejestracja
 * jej komponentów w rejestrze.
 */

const PREFIX = "/inwestycja";

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

export default async function InvestmentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const page = await loadPage(slug);

  if (!page) notFound();

  const schema = await buildPageSchema(page);

  return (
    <>
      <JsonLd data={schema} />
      <InvestmentSectionRenderer page={page} />
    </>
  );
}
