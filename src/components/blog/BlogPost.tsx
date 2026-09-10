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
  const meta = [author, formatDate(updatedAt)].filter(Boolean).join(" · ");

  return (
    <article>
      {/* Zdjęcie na pełną szerokość z tytułem na nim — bg-[#1D1D1D] jako tło zapasowe, gdy wpis nie ma jeszcze zdjęcia głównego, żeby banner z tytułem zawsze wyglądał spójnie, nie tylko gdy jest cover. */}
      <div className="relative h-[45vh] min-h-[360px] w-full overflow-hidden bg-[#1D1D1D] md:h-[65vh]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {/* Cień od dołu (czytelność tytułu) + osobny cień od góry (czytelność transparentnego NavBar, patrz src/components/home/NavBar.tsx, dopóki się nie przescrolluje) — dwie warstwy, bo jeden gradient przez całą wysokość zawsze robił kompromis na którymś końcu. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-[160px] bg-gradient-to-b from-black/65 to-transparent md:h-[240px]" />

        <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-10 text-center md:pb-16">
          {meta && <span className="font-poppins text-[13px] uppercase tracking-[0.08em] text-white/70">{meta}</span>}
          <h1 className="mt-3 max-w-4xl font-poppins text-3xl font-bold leading-[1.15] text-white sm:text-4xl md:text-5xl">{title}</h1>
        </div>
      </div>

      <Container className="max-w-3xl py-[48px] md:py-[80px]">
        {excerpt && <p className="font-montserrat text-lg font-light text-gray-600">{excerpt}</p>}

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
        <div
          className={`${excerpt ? "mt-8" : ""} text-[17px] text-zinc-700 ${RICH_TEXT_CONTENT_CLASS}`}
          dangerouslySetInnerHTML={{ __html: body }}
        />

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
