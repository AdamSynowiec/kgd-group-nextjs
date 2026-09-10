import type { MetadataRoute } from "next";
import { getAllPages, getSite, toUrlPath } from "@/lib/content";
import { getAllCollectionSlugs } from "@/lib/collections";
import { getCollectionDefinition } from "@/lib/collections/registry";

export const dynamic = "force-static";

const BLOG = getCollectionDefinition("blog");

/**
 * Generowane przy buildzie z tej samej listy stron co router (getAllPages()),
 * więc nowa podstrona w bazie trafia do sitemapy automatycznie — bez ręcznego
 * dopisywania jej gdziekolwiek. Wpisy bloga dochodzą tym samym mechanizmem
 * (getAllCollectionSlugs) — bez stron paginacji /blog/page/N, indeksuje się
 * tylko kanoniczne /blog i pojedyncze wpisy (standardowa praktyka SEO).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSite().seoDefaults.metadataBase.replace(/\/+$/, "");
  const [pages, blogSlugs] = await Promise.all([getAllPages(), getAllCollectionSlugs(BLOG.key, BLOG.pageSize)]);

  const pageEntries = pages.map((page) => ({
    url: new URL(toUrlPath(page.slug), base).toString(),
    lastModified: page.updatedAt,
  }));

  const blogEntries = blogSlugs.map((slug) => ({
    url: new URL(toUrlPath(`/blog/${slug}`), base).toString(),
  }));

  return [...pageEntries, ...blogEntries];
}
