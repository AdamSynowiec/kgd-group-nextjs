import Link from "next/link";
import { unwrap } from "@/lib/editable";
import type { BlogPostContent } from "./types";

/** Lista wpisów + paginacja — współdzielone przez src/app/(site)/blog/page.tsx i .../blog/page/[n]/page.tsx. */
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
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="mb-10 text-3xl font-bold tracking-tight text-zinc-900">Blog</h1>

      {items.length === 0 ? (
        <p className="text-zinc-500">Brak wpisów.</p>
      ) : (
        <ul className="space-y-10">
          {items.map((item) => (
            <li key={item.slug} className="border-b border-zinc-100 pb-10 last:border-b-0">
              <PostCard item={item} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

function PostCard({ item }: { item: BlogPostContent }) {
  const title = unwrap(item.title);
  const excerpt = unwrap(item.excerpt);
  const cover = unwrap(item.coverImage);
  const author = unwrap(item.author);

  return (
    <article className="flex flex-col gap-4 sm:flex-row">
      {cover && (
        <Link href={`/blog/${item.slug}`} className="block shrink-0 overflow-hidden rounded-lg bg-zinc-100 sm:w-48">
          {/* eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie */}
          <img src={cover} alt="" className="aspect-[4/3] w-full object-cover" />
        </Link>
      )}
      <div className="min-w-0">
        <h2 className="text-xl font-semibold text-zinc-900">
          <Link href={`/blog/${item.slug}`} className="hover:underline">
            {title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {[author, formatDate(item.publishedAt)].filter(Boolean).join(" · ")}
        </p>
        {excerpt && <p className="mt-3 text-zinc-600">{excerpt}</p>}
      </div>
    </article>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null;

  const prevHref = page <= 2 ? "/blog" : `/blog/page/${page - 1}`;
  const nextHref = `/blog/page/${page + 1}`;

  return (
    <nav className="mt-12 flex items-center justify-between text-sm">
      {page > 1 ? (
        <Link href={prevHref} className="text-zinc-600 hover:underline">
          &larr; Poprzednia
        </Link>
      ) : (
        <span />
      )}
      <span className="text-zinc-400">
        Strona {page} z {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={nextHref} className="text-zinc-600 hover:underline">
          Następna &rarr;
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
