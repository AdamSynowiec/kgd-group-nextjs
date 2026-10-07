import Link from "next/link";
import { getChildPages, getPageBySlug } from "@/lib/content";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "@/components/home/Container";

export const BLOG_PAGE_SIZE = 9;

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
    <Container className="py-[64px] md:py-[100px]">
      <div id="wpisy" className="scroll-mt-24" />
      {items.length === 0 ? (
        <p className="py-16 text-center font-poppins text-gray-500">Brak wpisów.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {items.map((item, index) => (
            <PostCard key={item.slug} index={(page - 1) * BLOG_PAGE_SIZE + index} slug={item.slug} title={unwrap(item.title) ?? item.slug} updatedAt={item.updatedAt} fields={findBlogPostFields(item)} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </Container>
  );
}

export function findBlogPostFields(page: { sections: { component: string; fields?: Record<string, unknown> }[] }): BlogPostCardFields {
  return (page.sections.find((section) => section.component === "BlogPost")?.fields ?? {}) as BlogPostCardFields;
}

/**
 * Karta wpisu (bez zdjęcia) — współdzielona z sekcją ostatnich wpisów na stronie głównej
 * (src/components/home/LatestPosts.tsx). Język jak Steps/FeatureGrid w /wykonczenie-pod-klucz:
 * biała karta z cienkim obrysem, złota kreska i duży numer w tle, tytuł Ranade, strzałka na dole.
 * "headingAs" = poziom nagłówka: h2 na /blog, h3 pod nagłówkiem sekcji na stronie głównej.
 */
export function PostCard({
  slug,
  title,
  updatedAt,
  fields,
  index = 0,
  headingAs: Heading = "h2",
}: {
  slug: string;
  title: string;
  updatedAt?: string;
  fields: BlogPostCardFields;
  index?: number;
  headingAs?: "h2" | "h3";
}) {
  const excerpt = unwrap(fields.excerpt);
  const author = unwrap(fields.author);
  const meta = [author, formatDate(updatedAt)].filter(Boolean).join(" · ");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden bg-white p-8 ring-1 ring-black/[0.06] shadow-[0_10px_30px_rgba(0,0,0,0.03)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_55px_rgba(201,171,139,0.3)]">
      <div className="flex items-start justify-between">
        <span className="h-[3px] w-10 bg-[#C9AB8B] transition-all duration-500 group-hover:w-20" />
        <span className="select-none font-ranade-variable text-[64px] font-thin leading-none text-black/[0.06] transition-colors duration-500 group-hover:text-[#C9AB8B]/30">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      {meta && <span className="mt-6 font-poppins text-[11px] font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{meta}</span>}

      <Heading className="mt-3 line-clamp-3 font-ranade-variable text-[22px] font-light leading-snug text-[#141414] md:text-[24px]">
        <Link href={slug} className="after:absolute after:inset-0">
          {title}
        </Link>
      </Heading>

      {excerpt && <p className="mt-3 line-clamp-4 flex-1 font-poppins text-[14px] font-light leading-relaxed text-[#6b6b6b]">{excerpt}</p>}

      <span className="mt-8 inline-flex items-center gap-3 font-poppins text-[12px] uppercase tracking-[0.2em] text-[#141414] transition-colors duration-300 group-hover:text-[#C9AB8B]">
        Czytaj więcej
        <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
      </span>
    </article>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const prevHref = page <= 2 ? "/blog" : `/blog/page/${page - 1}`;
  const nextHref = `/blog/page/${page + 1}`;
  const pillClass =
    "inline-flex items-center gap-3 rounded-full border border-[#141414] px-7 py-3 font-poppins text-[12px] uppercase tracking-[0.2em] text-[#141414] transition-colors duration-300 hover:border-[#C9AB8B] hover:text-[#C9AB8B]";

  return (
    <nav className="mt-12 flex items-center justify-between md:mt-16">
      {page > 1 ? (
        <Link href={prevHref} className={pillClass}>
          ← Poprzednia
        </Link>
      ) : (
        <span />
      )}
      <span className="font-ranade-variable text-[15px] tracking-[0.2em] text-black/50">
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
