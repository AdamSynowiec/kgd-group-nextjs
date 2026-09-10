import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogIndexTemplate from "@/components/blog/BlogIndexTemplate";
import type { BlogPostContent } from "@/components/blog/types";
import { getCollectionItems, getCollectionPageCount } from "@/lib/collections";
import { getCollectionDefinition } from "@/lib/collections/registry";

/**
 * /blog/page/2, /blog/page/3, ... — strona 1 to /blog (osobny plik, nie tu),
 * żeby uniknąć niejednoznacznego /blog/2 kolidującego z ewentualnym slugiem
 * wpisu "2" (patrz src/app/(site)/blog/[slug]/page.tsx i rezerwację slugu
 * "page" w CollectionAdminController::createItem).
 */

const COLLECTION = getCollectionDefinition("blog");

export const dynamicParams = false;

export async function generateStaticParams() {
  const totalPages = await getCollectionPageCount(COLLECTION.key, COLLECTION.pageSize);

  // "output: export" nie pozwala na PUSTĄ listę parametrów dla trasy
  // dynamicznej (przynajmniej jeden plik musi powstać) — gdy realnie nie ma
  // jeszcze strony 2 (za mało wpisów), i tak generujemy jej placeholder;
  // komponent poniżej i tak zwróci notFound() dla page > totalPages, więc
  // wygenerowany plik po prostu będzie statyczną stroną 404, nigdzie nie
  // zalinkowaną, dopóki realna strona 2 nie powstanie.
  const pageCount = Math.max(1, totalPages - 1);
  return Array.from({ length: pageCount }, (_, i) => ({ n: String(i + 2) }));
}

type Params = { n: string };

export const metadata: Metadata = { title: "Blog" };

export default async function BlogIndexPagedPage({ params }: { params: Promise<Params> }) {
  const { n } = await params;
  const page = Number(n);

  if (!Number.isInteger(page) || page < 2) notFound();

  const { items, totalPages } = await getCollectionItems(COLLECTION.key, page, COLLECTION.pageSize);
  if (page > totalPages) notFound();

  return <BlogIndexTemplate items={items as BlogPostContent[]} page={page} totalPages={totalPages} />;
}
