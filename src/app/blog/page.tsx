import type { Metadata } from "next";
import BlogIndexTemplate from "@/components/blog/BlogIndexTemplate";
import type { BlogPostContent } from "@/components/blog/types";
import { getCollectionItems } from "@/lib/collections";
import { getCollectionDefinition } from "@/lib/collections/registry";

const COLLECTION = getCollectionDefinition("blog");

export const metadata: Metadata = { title: "Blog" };

/** /blog — strona 1. Strony 2+ patrz src/app/blog/page/[n]/page.tsx (ten sam szablon, inny fetch). */
export default async function BlogIndexPage() {
  const { items, totalPages } = await getCollectionItems(COLLECTION.key, 1, COLLECTION.pageSize);

  return <BlogIndexTemplate items={items as BlogPostContent[]} page={1} totalPages={totalPages} />;
}
