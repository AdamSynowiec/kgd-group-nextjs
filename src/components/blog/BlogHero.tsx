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
 * Wygląd: nagłówek na jasnym tle z rozmytymi "plamami" światła w kolorze
 * marki (#C9AB8B) — ten sam język wizualny co pulsujący blask w tle
 * src/components/home/Hero.tsx (tam biały na ciemnym, tu złoty na jasnym),
 * plus eyebrow jako pigułka (border+dot) zamiast gołego tekstu — czytelniej
 * niż poprzednia wersja ze złotym nagłówkiem na jasnym tle (za mały kontrast).
 *
 * pt-[148px]/md:pt-[280px] = wysokość fixed NavBar (100px/200px, patrz
 * NavBar.tsx) + zwykły odstęp sekcji (48px/80px) — src/app/blog/layout.tsx
 * NIE dodaje już globalnego odstępu pod NavBar (zdjęcie w BlogPost.tsx ma
 * sięgać do samej góry), więc jasne tło tej sekcji musi zrobić to samo, ale
 * lokalnie, tu.
 */
export default function BlogHero({ fields }: { fields: BlogHeroFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const heading = unwrap(fields.heading);
  const intro = unwrap(fields.intro);

  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-[#FBFBFB] pt-[148px] pb-[64px] md:pt-[280px] md:pb-[96px]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#C9AB8B]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[380px] w-[380px] rounded-full bg-[#C9AB8B]/15 blur-3xl" />

      <Container className="relative text-center">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C9AB8B]/30 bg-white px-4 py-1.5 font-poppins text-[12px] font-medium uppercase tracking-[0.1em] text-[#C9AB8B] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B]" />
            {eyebrow}
          </span>
        )}
        <h1 className="mx-auto mt-5 max-w-3xl font-poppins text-4xl font-bold leading-[1.1] text-[#1D1D1D] sm:text-5xl md:text-6xl">
          {heading}
        </h1>
        {intro && (
          <p className="mx-auto mt-5 max-w-xl font-montserrat text-base font-light text-gray-500 md:text-lg">{intro}</p>
        )}
      </Container>
    </section>
  );
}
