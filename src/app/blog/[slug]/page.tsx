import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostTemplate from "@/components/blog/BlogPostTemplate";
import type { BlogPostContent } from "@/components/blog/types";
import { getAllCollectionSlugs, getCollectionItemBySlug } from "@/lib/collections";
import { getCollectionDefinition } from "@/lib/collections/registry";
import { buildMetadata } from "@/lib/seo";
import type { PageSeo } from "@/lib/content";

const COLLECTION = getCollectionDefinition("blog");

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getAllCollectionSlugs(COLLECTION.key, COLLECTION.pageSize);

  if (slugs.length === 0) {
    // "output: export" nie pozwala na pustą listę parametrów dla trasy
    // dynamicznej. "page" jest zarezerwowanym slugiem (patrz
    // CollectionAdminController::createItem — nigdy nie kolidowałby z
    // prawdziwym wpisem), więc ten placeholder bezpiecznie renderuje się
    // jako notFound() poniżej, dopóki nie powstanie pierwszy prawdziwy wpis.
    return [{ slug: "page" }];
  }

  return slugs.map((slug) => ({ slug }));
}

type Params = { slug: string };

async function loadPost(slug: string): Promise<BlogPostContent | null> {
  const item = await getCollectionItemBySlug(COLLECTION.key, slug);
  return item ? (item as unknown as BlogPostContent) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return {};

  return buildMetadata({ slug: `/blog/${post.slug}`, seo: post.seo as PageSeo | undefined });
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await loadPost(slug);

  if (!post) notFound();

  return <BlogPostTemplate post={post} />;
}
