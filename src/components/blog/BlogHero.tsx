import { unwrap, type EditableValue } from "@/lib/editable";
import EditorialHero from "@/components/shared/EditorialHero";

type BlogHeroFields = {
  eyebrow?: EditableValue<string> | string;
  heading?: EditableValue<string> | string;
  intro?: EditableValue<string> | string;
};

/**
 * Sekcja nagłówkowa strony /blog — treść z `pages` (slug "/blog", sekcja
 * component:"BlogHero"), edytowalna z panelu. Renderuje ją src/app/blog/page.tsx /
 * page/[n]/page.tsx bezpośrednio. Wizualnie: ten sam EditorialHero co strona
 * główna, /wykonczenie-pod-klucz i /kgd-building (zdjęcie jako poster, bez wideo).
 */
export default function BlogHero({ fields }: { fields: BlogHeroFields }) {
  return (
    <EditorialHero
      eyebrow={unwrap(fields.eyebrow)}
      heading={unwrap(fields.heading) ?? ""}
      lead={unwrap(fields.intro)}
      poster="/home/images/image00018-min.webp"
      scrollTo="#wpisy"
    />
  );
}
