import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Panel administracyjny nigdy nie ma trafić do wyszukiwarek. */
export const metadata: Metadata = {
  title: "Panel administracyjny",
  robots: { index: false, follow: false },
};

/** Bez <main> tutaj — AdminShell (login lub dashboard) renderuje własny, jedyny <main> na stronę. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
