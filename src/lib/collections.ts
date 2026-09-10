import { cache } from "react";
import { apiGetWithMeta } from "@/lib/content";

/**
 * Warstwa dostępu do "kolekcji" (blog i każda przyszła — patrz
 * src/lib/collections/registry.ts) — mirror content.ts, ten sam backend
 * (?route=/collection/...), to samo "czas builda, nie runtime" (patrz
 * komentarz o output:"export" w content.ts::apiGet).
 */

export type CollectionItemContent = Record<string, unknown> & {
  slug: string;
  publishedAt: string | null;
};

type ListMeta = { page: number; pageSize: number; total: number; totalPages: number };
type ItemMeta = { slug: string; publishedAt: string | null; updatedAt: string };

/** ?route=/collection/<collection>&page=&pageSize= — strona opublikowanych elementów, najnowsze pierwsze. */
export const getCollectionItems = cache(
  async (
    collection: string,
    page: number,
    pageSize: number
  ): Promise<{ items: CollectionItemContent[]; totalPages: number; total: number }> => {
    const { data, meta } = await apiGetWithMeta<CollectionItemContent[], ListMeta>(`/collection/${collection}`, {
      page: String(page),
      pageSize: String(pageSize),
    });

    return { items: data ?? [], totalPages: meta.totalPages ?? 1, total: meta.total ?? 0 };
  }
);

/** Liczba stron listy pod generateStaticParams() paginacji — jeden lekki fetch strony 1. */
export async function getCollectionPageCount(collection: string, pageSize: number): Promise<number> {
  const { totalPages } = await getCollectionItems(collection, 1, pageSize);
  return totalPages;
}

/** ?route=/collection/<collection>/<slug> — pojedynczy opublikowany element. */
export const getCollectionItemBySlug = cache(
  async (collection: string, slug: string): Promise<(Record<string, unknown> & ItemMeta) | null> => {
    const { data, meta } = await apiGetWithMeta<Record<string, unknown>, ItemMeta>(`/collection/${collection}/${slug}`);
    if (data === null) return null;

    return { ...data, slug: meta.slug, publishedAt: meta.publishedAt, updatedAt: meta.updatedAt };
  }
);

/** Wszystkie opublikowane slugi — pod generateStaticParams() strony szczegółu. Kolekcje są małe na tyle, że jeden przebieg po wszystkich stronach jest tani. */
export async function getAllCollectionSlugs(collection: string, pageSize = 100): Promise<string[]> {
  const first = await getCollectionItems(collection, 1, pageSize);
  const slugs = first.items.map((item) => item.slug);

  for (let page = 2; page <= first.totalPages; page++) {
    const next = await getCollectionItems(collection, page, pageSize);
    slugs.push(...next.items.map((item) => item.slug));
  }

  return slugs;
}
