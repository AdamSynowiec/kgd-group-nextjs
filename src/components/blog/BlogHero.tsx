import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "@/components/home/Container";
import Separator from "@/components/home/Separator";
import P from "@/components/home/P";

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
 * Stylistyka zgodna ze standardami strony głównej KGD (złoty akcent
 * #C9AB8B, Container/Separator/P z src/components/home/).
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
    <section className="border-b border-gray-100 bg-[#FBFBFB] pt-[148px] pb-[48px] md:pt-[280px] md:pb-[80px]">
      <Container className="text-center">
        {eyebrow && <span className="font-poppins text-[13px] uppercase tracking-[0.08em] text-gray-500">{eyebrow}</span>}
        <h1 className="mt-3 font-poppins text-xl font-bold leading-[1.25] text-[#C9AB8B] sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl">
          {heading}
        </h1>
        <Separator className="mx-auto my-6 md:my-8" />
        {intro && <P className="mx-auto max-w-2xl">{intro}</P>}
      </Container>
    </section>
  );
}
