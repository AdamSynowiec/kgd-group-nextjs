import type { MetadataRoute } from "next";
import { getAllPages, getSite, toUrlPath } from "@/lib/content";

export const dynamic = "force-static";

/**
 * Generowane przy buildzie z tej samej listy stron co router (getAllPages()),
 * więc nowa podstrona w bazie trafia do sitemapy automatycznie — bez ręcznego
 * dopisywania jej gdziekolwiek. Wpisy bloga to od refaktoru zwykłe strony w
 * `pages` (parent:"/blog"), więc dochodzą tym samym mechanizmem, bez
 * osobnego zapytania — jedyny wyjątek to strony paginacji /blog/page/N,
 * których getAllPages() w ogóle nie zna (nie są wierszami w bazie), więc i
 * tak nigdy nie trafiają do sitemapy (standardowa praktyka SEO — indeksuje
 * się tylko kanoniczne /blog i pojedyncze wpisy).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSite().seoDefaults.metadataBase.replace(/\/+$/, "");
  const pages = await getAllPages();

  return pages.map((page) => ({
    url: new URL(toUrlPath(page.slug), base).toString(),
    lastModified: page.updatedAt,
  }));
}
