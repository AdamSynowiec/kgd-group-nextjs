import type { ReactNode } from "react";
import { investmentFontVariables } from "@/lib/fonts";
import { getPageBySlug } from "@/lib/content";
import CallToUs from "@/components/shared/CallToUs";

/**
 * Layout dla "/wykonczenie-pod-klucz" — mirror src/app/kgd-building/layout.tsx.
 * Własny NavBar/Contact/Footer jako sekcje z rejestru
 * (src/lib/wykonczenie-pod-klucz/sections.tsx), bez SiteHeader/SiteFooter z (site).
 * Fonty: investmentFontVariables (zawiera font-ranade-variable) — ta rodzina
 * ma edytorialny, "deweloperski" charakter stron inwestycji (duże, szczupłe
 * nagłówki Ranade), nie SaaS-owy Poppins/Montserrat jak strona główna.
 */
export default async function WykonczeniePodKluczLayout({ children }: { children: ReactNode }) {
  const homePage = await getPageBySlug("/");
  const callToUsSection = homePage?.sections.find((section) => section.component === "CallToUs");

  return (
    <div className={investmentFontVariables}>
      {children}
      {callToUsSection && <CallToUs fields={callToUsSection.fields ?? {}} />}
    </div>
  );
}
