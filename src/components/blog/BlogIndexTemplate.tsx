import Link from "next/link";
import { unwrap } from "@/lib/editable";
import { poppins, montserrat } from "@/lib/fonts";
import Container from "@/components/home/Container";
import Separator from "@/components/home/Separator";
import P from "@/components/home/P";
import type { BlogPostContent } from "./types";

/**
 * Lista wpisów + paginacja — współdzielone przez src/app/blog/page.tsx i
 * .../blog/page/[n]/page.tsx.
 *
 * Stylistyka dopasowana do standardów strony głównej KGD (złoty akcent
 * #C9AB8B, ciemny grafit #1D1D1D, Poppins/Montserrat, Container/Separator/P
 * z src/components/home/) — patrz src/components/home/HomePage.tsx. NavBar/
 * Contact/Footer (identyczne jak na stronie głównej) renderuje
 * src/app/blog/layout.tsx, nie ten plik. Fonty nie są ładowane w root layout
 * (por. src/lib/fonts.ts) — zmienne CSS (--poppins-src/--montserrat-src) są
 * już dołączone przez ten layout, ale i tak dołączone lokalnie tutaj, żeby
 * komponent działał samodzielnie (np. w dev-preview). Same komponenty treści
 * (karta wpisu, nagłówek listy, paginacja) są własne, dopasowane do bloga —
 * nie 1:1 skopiowane z homepage'a.
 */
export default function BlogIndexTemplate({
  items,
  page,
  totalPages,
}: {
  items: BlogPostContent[];
  page: number;
  totalPages: number;
}) {
  return (
    <div className={`${poppins.variable} ${montserrat.variable} bg-white`}>
      <section className="border-b border-gray-100 bg-[#FBFBFB] py-[48px] md:py-[80px]">
        <Container className="text-center">
          <span className="font-poppins text-[13px] uppercase tracking-[0.08em] text-gray-500">Aktualności</span>
          <h1 className="mt-3 font-poppins text-xl font-bold leading-[1.25] text-[#C9AB8B] sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
            Blog KGD Group
          </h1>
          <Separator className="mx-auto my-6 md:my-8" />
          <P className="mx-auto max-w-2xl">Nowości, porady i historie ze świata inwestycji KGD Group.</P>
        </Container>
      </section>

      <Container className="py-[48px] md:py-[80px]">
        {items.length === 0 ? (
          <p className="py-16 text-center font-poppins text-gray-500">Brak wpisów.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {items.map((item) => (
              <PostCard key={item.slug} item={item} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} />
      </Container>
    </div>
  );
}

function PostCard({ item }: { item: BlogPostContent }) {
  const title = unwrap(item.title);
  const excerpt = unwrap(item.excerpt);
  const cover = unwrap(item.coverImage);
  const author = unwrap(item.author);
  const meta = [author, formatDate(item.publishedAt)].filter(Boolean).join(" · ");

  return (
    <article className="group flex flex-col overflow-hidden border border-gray-200 bg-white transition-colors duration-300 hover:border-[#C9AB8B]/60">
      <Link href={`/blog/${item.slug}`} className="relative block aspect-[16/10] w-full overflow-hidden bg-gray-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-poppins text-xs uppercase tracking-[0.2em] text-gray-300">KGD Group</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-6 md:p-8">
        {meta && <span className="font-poppins text-[13px] uppercase tracking-[0.08em] text-gray-500">{meta}</span>}

        <h2 className="mt-2 font-poppins text-lg font-semibold leading-snug text-[#1D1D1D]">
          <Link href={`/blog/${item.slug}`} className="hover:underline">
            {title}
          </Link>
        </h2>

        <div className="my-4 h-[1px] w-10 bg-[#C9AB8B]" />

        {excerpt && <p className="flex-1 font-montserrat text-[15px]/[26px] font-light text-gray-600">{excerpt}</p>}

        <Link
          href={`/blog/${item.slug}`}
          className="mt-6 inline-flex items-center gap-2 font-poppins text-sm text-[#C9AB8B]"
        >
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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
}
