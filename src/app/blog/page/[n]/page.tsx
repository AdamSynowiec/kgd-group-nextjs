import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import BlogHero from "@/components/blog/BlogHero";
import BlogPostGrid, { getBlogPageCount } from "@/components/blog/BlogPostGrid";

/**
 * /blog/page/2, /blog/page/3, ... — strona 1 to /blog (osobny plik, nie tu),
 * żeby uniknąć niejednoznacznego /blog/2 kolidującego z ewentualnym slugiem
 * wpisu "2" (patrz src/app/blog/[slug]/page.tsx i rezerwację adresu
 * "/blog/page" w AdminController::createPage).
 */

export const dynamicParams = false;

export async function generateStaticParams() {
  const totalPages = await getBlogPageCount();

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

  const blogPage = await getPageBySlug("/blog");
  if (!blogPage) notFound();

  const totalPages = await getBlogPageCount();
  if (page > totalPages) notFound();

  const hero = blogPage.sections.find((section) => section.component === "BlogHero");

  return (
    <>
      <BlogHero fields={hero?.fields ?? {}} />
      <BlogPostGrid page={page} />
    </>
  );
}
