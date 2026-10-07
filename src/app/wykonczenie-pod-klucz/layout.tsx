import type { ReactNode } from "react";
import { getPageBySlug } from "@/lib/content";
import { unwrap, type EditableValue } from "@/lib/editable";
import { investmentFontVariables } from "@/lib/fonts";
import NavBar from "@/components/home/NavBar";
import CallToUs from "@/components/shared/CallToUs";
import type { MenuItem } from "@/components/home/NavMenuItem";

/**
 * Layout dla "/wykonczenie-pod-klucz" — mirror src/app/kgd-building/layout.tsx.
 * Nagłówek: TEN SAM NavBar co na stronie głównej (logo, menu, telefon czytane
 * wprost z treści "/", jak w src/app/blog/layout.tsx) — spójność i jedno
 * miejsce edycji w panelu. Contact/Footer zostają sekcjami z rejestru
 * (src/lib/wykonczenie-pod-klucz/sections.tsx).
 * Fonty: investmentFontVariables (zawiera font-ranade-variable i Poppins).
 */
export default async function WykonczeniePodKluczLayout({ children }: { children: ReactNode }) {
  const homePage = await getPageBySlug("/");
  const homeSection = homePage?.sections.find((section) => section.component === "HomePage");
  const callToUsSection = homePage?.sections.find((section) => section.component === "CallToUs");

  const logo = unwrap(homeSection?.fields?.logo as EditableValue<string> | string | undefined) ?? "";
  const navMenu = unwrap(homeSection?.fields?.navMenu as EditableValue<MenuItem[]> | MenuItem[] | undefined) ?? [];
  const navPhone = unwrap(homeSection?.fields?.navPhone as EditableValue<string> | string | undefined) ?? "";

  return (
    <div className={investmentFontVariables}>
      {homeSection && <NavBar logo={logo} menu={navMenu} phone={navPhone} />}
      {children}
      {callToUsSection && <CallToUs fields={callToUsSection.fields ?? {}} />}
    </div>
  );
}
