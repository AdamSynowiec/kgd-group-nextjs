import type { ReactNode } from "react";
import { investmentFontVariables } from "@/lib/fonts";
import { getPageBySlug } from "@/lib/content";
import CallToUs from "@/components/shared/CallToUs";

/**
 * Layout dla całej rodziny /kgd-building/** — mirror src/app/inwestycja/layout.tsx.
 * Własny NavBar/Contact/Footer jako sekcje z rejestru (src/lib/kgd-building/sections.tsx),
 * bez SiteHeader/SiteFooter z (site). Fonty: investmentFontVariables zawiera
 * już Poppins (font-poppins), więc nie trzeba nowego loadera — patrz src/lib/fonts.ts.
 */
export default async function KgdBuildingLayout({ children }: { children: ReactNode }) {
  const homePage = await getPageBySlug("/");
  const callToUsSection = homePage?.sections.find((section) => section.component === "CallToUs");

  return (
    <div className={investmentFontVariables}>
      {children}
      {callToUsSection && <CallToUs fields={callToUsSection.fields ?? {}} />}
    </div>
  );
}
