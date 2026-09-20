import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "@/components/home/Container";

type BlogHeroFields = {
  eyebrow?: EditableValue<string> | string;
  heading?: EditableValue<string> | string;
  intro?: EditableValue<string> | string;
};

/**
 * Sekcja nagłówkowa strony /blog — treść z `pages` (slug "/blog", sekcja
 * component:"BlogHero"), edytowalna z panelu jak każda inna sekcja. Renderuje
 * ją src/app/blog/page.tsx / page/[n]/page.tsx bezpośrednio (blog ma tylko
 * jeden typ sekcji na trasę, więc bez pełnego rejestru jak
 * src/lib/sections.tsx — patrz komentarz tam o generycznym silniku (site)).
 *
 * Zdjęcie na pełną wysokość sięgające do samej góry (mirror BlogPost.tsx) +
 * DWIE warstwy cienia — osobna od góry (czytelność transparentnego NavBar,
 * który się na tym nakłada, dopóki się nie przescrolluje) i osobna od dołu
 * (czytelność nagłówka/tekstu) — zamiast wcześniejszej wersji z jasnym tłem,
 * na którym biały tekst transparentnego NavBar-a ginął (patrz NavBar.tsx —
 * celowo NIE dostał tu specjalnego przypadku dla /blog, żeby zostać
 * uniwersalny; to zdjęcie+gradient rozwiązuje kontrast lokalnie, tak samo
 * jak już robi to BlogPost.tsx dla pojedynczych wpisów).
 */
export default function BlogHero({ fields }: { fields: BlogHeroFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const heading = unwrap(fields.heading);
  const intro = unwrap(fields.intro);

  return (
    <section className="relative flex h-[52vh] min-h-[420px] w-full items-center overflow-hidden bg-[#1D1D1D] md:h-[60vh]">
      {/* eslint-disable-next-line @next/next/no-img-element -- output:"export"/images.unoptimized, jak wszędzie indziej w projekcie */}
      <img
        src="/home/images/image00018-min.webp"
        alt=""
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
      <div className="absolute inset-x-0 top-0 h-[160px] bg-gradient-to-b from-black/70 to-transparent md:h-[240px]" />

      <Container className="relative text-center">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-poppins text-[12px] font-medium uppercase tracking-[0.1em] text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B]" />
            {eyebrow}
          </span>
        )}
        <h1 className="mx-auto mt-5 max-w-3xl font-poppins text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl">
          {heading}
        </h1>
        {intro && (
          <p className="mx-auto mt-5 max-w-xl font-montserrat text-base font-light text-white/80 md:text-lg">{intro}</p>
        )}
      </Container>
    </section>
  );
}
