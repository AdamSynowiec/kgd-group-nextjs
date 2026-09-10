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
  const cover = unwrap(fields.coverImage);
  const author = unwrap(fields.author);
  const tags = unwrap(fields.tags) ?? [];
  const body = unwrap(fields.body) ?? "";

  return (
    <article className="py-[48px] md:py-[80px]">
      <Container className="max-w-3xl">
        <span className="font-poppins text-[13px] uppercase tracking-[0.08em] text-gray-500">
          {[author, formatDate(updatedAt)].filter(Boolean).join(" · ")}
        </span>

        <h1 className="mt-3 font-poppins text-2xl font-bold leading-[1.2] text-[#1D1D1D] sm:text-3xl md:text-4xl">{title}</h1>

        {excerpt && <p className="mt-4 font-montserrat text-lg font-light text-gray-600">{excerpt}</p>}

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie
          <img src={cover} alt="" className="mt-8 aspect-[16/9] w-full rounded-lg object-cover" />
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
        */}
        <div className={`mt-8 text-[17px] text-zinc-700 ${RICH_TEXT_CONTENT_CLASS}`} dangerouslySetInnerHTML={{ __html: body }} />

        {tags.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {tag}
              </li>
            ))}
          </ul>
        )}
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
