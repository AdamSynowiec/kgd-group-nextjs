import type { MetadataRoute } from "next";
import { getAllPages, getSite, toUrlPath } from "@/lib/content";

export const dynamic = "force-static";

/**
 * Generowane przy buildzie z tej samej listy stron co router (getAllPages()),
 * więc nowa podstrona w bazie trafia do sitemapy automatycznie — bez ręcznego
 * dopisywania jej gdziekolwiek.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSite().seoDefaults.metadataBase.replace(/\/+$/, "");
  const pages = await getAllPages();

  return pages.map((page) => ({
    url: new URL(toUrlPath(page.slug), base).toString(),
    lastModified: page.updatedAt,
  }));
}
