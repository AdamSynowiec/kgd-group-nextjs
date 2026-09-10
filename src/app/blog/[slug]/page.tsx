import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChildPages, getPageBySlug } from "@/lib/content";
import { unwrap } from "@/lib/editable";
import { buildMetadata } from "@/lib/seo";
import BlogPost from "@/components/blog/BlogPost";

export const dynamicParams = false;

export async function generateStaticParams() {
  const children = await getChildPages("/blog");
  const slugs = children.map((child) => child.slug.replace(/^\/blog\//, ""));

  if (slugs.length === 0) {
    // "output: export" nie pozwala na pustą listę parametrów dla trasy
    // dynamicznej. "page" jest zarezerwowanym adresem (patrz
    // AdminController::createPage — nigdy nie kolidowałby z prawdziwym
    // wpisem), więc ten placeholder bezpiecznie renderuje się jako
    // notFound() poniżej, dopóki nie powstanie pierwszy prawdziwy wpis.
    return [{ slug: "page" }];
  }

  return slugs.map((slug) => ({ slug }));
}

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPageBySlug(`/blog/${slug}`);
  return post ? buildMetadata(post) : {};
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPageBySlug(`/blog/${slug}`);

  if (!post) notFound();

  const section = post.sections.find((s) => s.component === "BlogPost");

  return <BlogPost title={unwrap(post.title) ?? post.slug} updatedAt={post.updatedAt ?? null} fields={section?.fields ?? {}} />;
}
