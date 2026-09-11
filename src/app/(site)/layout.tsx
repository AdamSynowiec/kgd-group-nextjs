import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import { getPageBySlug } from "@/lib/content";
import CallToUs from "@/components/shared/CallToUs";

/**
 * Layout tylko dla publicznych stron (grupa (site) — nie wpływa na URL,
 * tylko na strukturę plików). /admin ma własny, niezależny layout bez tego
 * nagłówka/stopki. Rozdzielone jako osobne trasy, nie warunkowo w jednym
 * komponencie — statyczny eksport nie może polegać na kliencie decydującym
 * w czasie renderu, co pokazać.
 *
 * CallToUs czytany raz ze strony głównej ("/"), jak w
 * src/app/blog/layout.tsx i src/app/inwestycja/layout.tsx — pływający
 * przycisk "szybki telefon" ma być wszędzie, nie tylko na stronie głównej.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const homePage = await getPageBySlug("/");
  const callToUsSection = homePage?.sections.find((section) => section.component === "CallToUs");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {callToUsSection && <CallToUs fields={callToUsSection.fields ?? {}} />}
    </>
  );
}
