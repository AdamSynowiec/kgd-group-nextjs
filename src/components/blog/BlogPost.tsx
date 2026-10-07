import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import { RICH_TEXT_CONTENT_CLASS } from "@/lib/richTextStyles";
import Container from "@/components/home/Container";

type BlogPostFields = {
  excerpt?: EditableValue<string> | string;
  coverImage?: EditableValue<string> | string;
  author?: EditableValue<string> | string;
  tags?: EditableValue<string[]> | string[];
  body?: EditableValue<string> | string;
};

/**
 * Treść pojedynczego wpisu — z `pages` (slug "/blog/<slug>", sekcja
 * component:"BlogPost"), renderowana przez src/app/blog/[slug]/page.tsx.
 * "title"/"updatedAt" (wyświetlana jako data) to standardowe pola Page, nie
 * część tej sekcji — dlatego przychodzą jako osobne propsy, nie przez
 * `fields` (mirror tego, jak Hero.tsx/RichText.tsx same NIE noszą tytułu
 * strony, ten żyje w Page.title).
 */
export default function BlogPost({
  title,
  updatedAt,
  fields,
}: {
  title: string;
  updatedAt: string | null;
  fields: BlogPostFields;
}) {
  const excerpt = unwrap(fields.excerpt);
  const author = unwrap(fields.author);
  const tags = unwrap(fields.tags) ?? [];
  const body = unwrap(fields.body) ?? "";
  const meta = [author, formatDate(updatedAt)].filter(Boolean).join(" · ");

  return (
    <article>
      {/* Nagłówek bez zdjęcia — ciemne tło ze złotym blaskiem i cienką ramką jak w EditorialHero; pod transparentnym NavBar-em, stąd duży górny odstęp. */}
      <header className="relative overflow-hidden bg-[#0f0f0f] font-poppins text-white">
        <div className="pointer-events-none absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-[#C9AB8B]/20 blur-[130px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-[#C9AB8B]/15 blur-[130px]" />
        <div className="pointer-events-none absolute inset-6 hidden border border-white/[0.08] md:block md:inset-10" />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-[0.22em] right-[3%] hidden select-none font-ranade-variable text-[34vw] font-thin leading-none text-transparent [-webkit-text-stroke:1px_rgba(201,171,139,0.22)] md:block"
        >
          {title.trim().charAt(0).toUpperCase()}
        </span>

        <Container className="relative max-w-5xl pb-16 pt-[140px] md:pb-24 md:pt-[240px]">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-white/50 transition-colors duration-300 hover:text-[#C9AB8B]"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
            Blog
          </Link>

          <span className="mt-10 block h-[3px] w-14 bg-[#C9AB8B]" />
          {meta && <span className="mt-6 block text-[12px] uppercase tracking-[0.25em] text-[#C9AB8B]">{meta}</span>}

          <h1 className="mt-5 max-w-4xl font-ranade-variable text-[34px] font-light leading-[1.08] sm:text-[48px] md:text-[64px]">{title}</h1>

          {tags.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag} className="rounded-full border border-white/20 px-4 py-1.5 text-[12px] font-light tracking-wide text-white/70">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </Container>
      </header>

      <Container className="max-w-3xl py-[48px] md:py-[80px]">
        {excerpt && (
          <p className="border-l-[3px] border-[#C9AB8B] pl-6 font-ranade-variable text-[20px] font-light leading-relaxed text-[#1a1a1a] md:text-[24px]">{excerpt}</p>
        )}

        {/*
          body to type:"richtext" — HTML, nie zwykły tekst (patrz
          RichTextEditor.tsx). Oczyszczane własnym sanitizeHtml()
          (src/lib/richText/sanitizeHtml.ts) w przeglądarce PRZY KAŻDEJ zmianie
          w edytorze (sanitize-on-write) — ta strona ufa już zapisanej treści
          tak samo, jak ufa wartości każdego innego pola edytowalnego
          wyłącznie przez zalogowanego redaktora; nie sanityzuje powtórnie przy
          renderze (build działa w Node bez DOM-u, a sanitizeHtml() wymaga
          DOMParser).
          "blog-article" = zakres stylów artykułu z src/app/blog-article.css.
        */}
        <div
          className={`blog-article ${excerpt ? "mt-8" : ""} text-[17px] text-zinc-700 ${RICH_TEXT_CONTENT_CLASS}`}
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </Container>
    </article>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pl-PL", { year: "numeric", month: "long", day: "numeric" });
}
