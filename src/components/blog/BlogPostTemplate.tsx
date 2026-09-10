import Link from "next/link";
import { unwrap } from "@/lib/editable";
import type { BlogPostContent } from "./types";

/** Pojedynczy wpis — patrz src/app/(site)/blog/[slug]/page.tsx. */
export default function BlogPostTemplate({ post }: { post: BlogPostContent }) {
  const title = unwrap(post.title);
  const cover = unwrap(post.coverImage);
  const author = unwrap(post.author);
  const body = unwrap(post.body) ?? "";
  const tags = unwrap(post.tags) ?? [];

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/blog" className="text-sm text-zinc-500 hover:underline">
        &larr; Blog
      </Link>

      <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900">{title}</h1>

      <p className="mt-3 text-sm text-zinc-400">
        {[author, formatDate(post.publishedAt)].filter(Boolean).join(" · ")}
      </p>

      {cover && (
        // eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie
        <img src={cover} alt="" className="mt-8 aspect-[16/9] w-full rounded-lg object-cover" />
      )}

      <div className="mt-8 whitespace-pre-wrap text-[17px] leading-relaxed text-zinc-700">{body}</div>

      {tags.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li key={tag} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
}
