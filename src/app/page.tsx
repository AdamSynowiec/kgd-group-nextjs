import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { buildPageSchema } from "@/lib/schema";
import JsonLd from "@/components/seo/JsonLd";
import HomeSectionRenderer from "@/lib/home/sections";
import { homeFontVariables } from "@/lib/fonts";

/**
 * Strona główna ("/") — poza grupą (site) celowo: (site)/layout.tsx renderuje
 * SiteHeader/SiteFooter (generyczne, dla /o-nas i innych stron silnika
 * Hero/RichText), a HomePage ma własny, pełnoekranowy NavBar i (współdzielony)
 * Footer jako sekcje z rejestru — dublowałyby się. Mirror
 * src/app/inwestycja/[...slug]/page.tsx (własny layout-scope, własny rejestr).
 */

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("/");
  return page ? buildMetadata(page) : {};
}

export default async function Home() {
  const page = await getPageBySlug("/");
  if (!page) notFound();

  const schema = await buildPageSchema(page);

  return (
    <div className={homeFontVariables}>
      <JsonLd data={schema} />
      <HomeSectionRenderer page={page} />
    </div>
  );
}
