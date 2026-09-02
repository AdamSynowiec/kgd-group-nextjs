import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandProvider } from "@/components/admin/BrandProvider";
import { getSite } from "@/lib/content";

/** Panel administracyjny nigdy nie ma trafić do wyszukiwarek. */
export function generateMetadata(): Metadata {
  const { brand } = getSite();
  return {
    title: `Panel administracyjny — ${brand.name}`,
    robots: { index: false, follow: false },
  };
}

/** Bez <main> tutaj — AdminShell (login lub dashboard) renderuje własny, jedyny <main> na stronę. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { brand } = getSite();

  return (
    <BrandProvider brand={brand}>
      <div className="flex min-h-full flex-1 flex-col">{children}</div>
    </BrandProvider>
  );
}
