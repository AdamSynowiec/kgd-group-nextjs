import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { buildPageSchema } from "@/lib/schema";
import JsonLd from "@/components/seo/JsonLd";
import WykonczeniePodKluczSectionRenderer from "@/lib/wykonczenie-pod-klucz/sections";

/**
 * Strona "/wykonczenie-pod-klucz" (bez segmentów) — mirror src/app/kgd-building/page.tsx.
 */
const SLUG = "/wykonczenie-pod-klucz";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(SLUG);
  return page ? buildMetadata(page) : {};
}

export default async function WykonczeniePodKluczPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const schema = await buildPageSchema(page);

  return (
    <>
      <JsonLd data={schema} />
      <WykonczeniePodKluczSectionRenderer page={page} />
    </>
  );
}
