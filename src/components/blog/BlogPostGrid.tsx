import Link from "next/link";
import { getChildPages, getPageBySlug } from "@/lib/content";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "@/components/home/Container";

export const BLOG_PAGE_SIZE = 10;

type BlogPostCardFields = {
  excerpt?: EditableValue<string> | string;
  coverImage?: EditableValue<string> | string;
  author?: EditableValue<string> | string;
};

/** Liczba stron paginacji dla dzieci strony "/blog" — pod generateStaticParams(). */
export async function getBlogPageCount(): Promise<number> {
  const children = await getChildPages("/blog");
  return Math.max(1, Math.ceil(children.length / BLOG_PAGE_SIZE));
}

/**
 * Siatka kart + paginacja dla /blog i /blog/page/[n] — jedyna część bloga,
 * która NIE jest treścią zapisaną w `pages` (nagłówek nad nią to sekcja
 * BlogHero, patrz src/components/blog/BlogHero.tsx): to zawsze była (i
 * musi zostać) logika wyprowadzona z zapytania "opublikowane dzieci strony
 * /blog" (dawniej collection_items, dziś pages.parent), nie da się tego
 * zapisać jako pojedynczy dokument treści niezależnie od tabeli.
 */
export default async function BlogPostGrid({ page }: { page: number }) {
  const children = await getChildPages("/blog");
  const totalPages = Math.max(1, Math.ceil(children.length / BLOG_PAGE_SIZE));
  const slice = children.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);
  const items = (await Promise.all(slice.map((child) => getPageBySlug(child.slug)))).filter((item) => item !== null);

  return (
    <Container className="py-[48px] md:py-[80px]">
      {items.length === 0 ? (
        <p className="py-16 text-center font-poppins text-gray-500">Brak wpisów.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {items.map((item) => (
            <PostCard key={item.slug} slug={item.slug} title={unwrap(item.title) ?? item.slug} updatedAt={item.updatedAt} fields={findBlogPostFields(item)} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </Container>
  );
}

function findBlogPostFields(page: { sections: { component: string; fields?: Record<string, unknown> }[] }): BlogPostCardFields {
  return (page.sections.find((section) => section.component === "BlogPost")?.fields ?? {}) as BlogPostCardFields;
}

function PostCard({
  slug,
  title,
  updatedAt,
  fields,
}: {
  slug: string;
  title: string;
  updatedAt?: string;
  fields: BlogPostCardFields;
}) {
  const excerpt = unwrap(fields.excerpt);
  const cover = unwrap(fields.coverImage);
  const author = unwrap(fields.author);
  const meta = [author, formatDate(updatedAt)].filter(Boolean).join(" · ");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#C9AB8B]/40 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)]">
      <Link href={slug} className="relative block aspect-[16/10] w-full overflow-hidden bg-gray-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie
          <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-poppins text-xs uppercase tracking-[0.2em] text-gray-300">KGD Group</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6">
        {meta && (
          <span className="inline-flex w-fit items-center gap-1.5 font-poppins text-[11px] font-medium uppercase tracking-[0.08em] text-[#C9AB8B]">
            <span className="h-1 w-1 rounded-full bg-[#C9AB8B]" />
            {meta}
          </span>
        )}

        <h2 className="mt-3 line-clamp-2 font-poppins text-lg font-semibold leading-snug text-[#1D1D1D]">
          <Link href={slug} className="transition-colors duration-300 group-hover:text-[#C9AB8B]">
            {title}
          </Link>
        </h2>

        {excerpt && <p className="mt-2.5 line-clamp-3 flex-1 font-montserrat text-[15px]/[26px] font-light text-gray-500">{excerpt}</p>}

        <Link href={slug} className="mt-5 inline-flex items-center gap-2 font-poppins text-sm font-medium text-[#C9AB8B]">
          Czytaj więcej
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </article>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const prevHref = page <= 2 ? "/blog" : `/blog/page/${page - 1}`;
  const nextHref = `/blog/page/${page + 1}`;
  const pillClass =
    "inline-flex items-center gap-2 rounded-full border border-[#C9AB8B] px-5 py-2 font-poppins text-sm font-light text-[#C9AB8B] transition-all duration-300 hover:bg-[#C9AB8B] hover:text-white";

  return (
    <nav className="mt-12 flex items-center justify-between md:mt-16">
      {page > 1 ? (
        <Link href={prevHref} className={pillClass}>
          ← Poprzednia
        </Link>
      ) : (
        <span />
      )}
      <span className="font-poppins text-sm text-gray-500">
        Strona {page} z {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={nextHref} className={pillClass}>
          Następna →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
}
