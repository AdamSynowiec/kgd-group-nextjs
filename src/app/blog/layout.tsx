import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { unwrap, type EditableValue } from "@/lib/editable";
import { homeFontVariables } from "@/lib/fonts";
import NavBar from "@/components/home/NavBar";
import Contact from "@/components/shared/Contact";
import Footer from "@/components/shared/Footer";
import type { MenuItem } from "@/components/home/NavMenuItem";

/**
 * Layout dla /blog/** — poza grupą (site) celowo, mirror src/app/page.tsx
 * (komentarz tam) i src/app/inwestycja/layout.tsx: blog ma wyglądać
 * IDENTYCZNIE jak strona główna (NavBar/Contact/Footer), więc renderuje te
 * same, współdzielone sekcje zamiast generycznego SiteHeader/SiteFooter z
 * (site)/layout.tsx. Pola NavBar/Contact/Footer są czytane wprost z treści
 * strony głównej ("/") — jedno miejsce edycji w panelu (/admin) dla obu
 * miejsc, zero duplikacji danych kontaktowych/nawigacji.
 */
export default async function BlogLayout({ children }: { children: ReactNode }) {
  const homePage = await getPageBySlug("/");
  if (!homePage) notFound();

  const homeSection = homePage.sections.find((section) => section.component === "HomePage");
  const contactSection = homePage.sections.find((section) => section.component === "Contact");
  const footerSection = homePage.sections.find((section) => section.component === "Footer");

  const logo = unwrap(homeSection?.fields?.logo as EditableValue<string> | string | undefined) ?? "";
  const navMenu = unwrap(homeSection?.fields?.navMenu as EditableValue<MenuItem[]> | MenuItem[] | undefined) ?? [];
  const navPhone = unwrap(homeSection?.fields?.navPhone as EditableValue<string> | string | undefined) ?? "";

  return (
    <div className={homeFontVariables}>
      <NavBar logo={logo} menu={navMenu} phone={navPhone} />

      {/*
        BEZ odstępu pod fixed NavBar tutaj (w odróżnieniu od wcześniejszej
        wersji) — tak jak na stronie głównej, gdzie NavBar nakłada się
        (transparentnie) na pełnoekranowy Hero, zdjęcie w BlogPost.tsx ma
        sięgać do samej góry, żeby NavBar wisiał na nim. Strony, które
        faktycznie potrzebują odstępu (bo ich nagłówek NIE jest ciemnym
        zdjęciem pod spodem, tylko jasnym tłem — patrz BlogHero.tsx) dodają
        go same, lokalnie, zamiast globalnie tutaj dla wszystkich.
      */}
      <main>{children}</main>

      {contactSection && <Contact fields={contactSection.fields ?? {}} />}
      {footerSection && <Footer fields={footerSection.fields ?? {}} />}
    </div>
  );
}
