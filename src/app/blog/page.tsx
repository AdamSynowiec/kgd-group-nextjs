import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import BlogHero from "@/components/blog/BlogHero";
import BlogPostGrid from "@/components/blog/BlogPostGrid";

export const metadata: Metadata = { title: "Blog" };

/** /blog — strona 1. Strony 2+ patrz src/app/blog/page/[n]/page.tsx (ten sam szablon, inny wycinek). */
export default async function BlogIndexPage() {
  const blogPage = await getPageBySlug("/blog");
  if (!blogPage) notFound();

  const hero = blogPage.sections.find((section) => section.component === "BlogHero");

  return (
    <>
      <BlogHero fields={hero?.fields ?? {}} />
      <BlogPostGrid page={1} />
    </>
  );
}
