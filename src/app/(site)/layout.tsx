import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

/**
 * Layout tylko dla publicznych stron (grupa (site) — nie wpływa na URL,
 * tylko na strukturę plików). /admin ma własny, niezależny layout bez tego
 * nagłówka/stopki. Rozdzielone jako osobne trasy, nie warunkowo w jednym
 * komponencie — statyczny eksport nie może polegać na kliencie decydującym
 * w czasie renderu, co pokazać.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
