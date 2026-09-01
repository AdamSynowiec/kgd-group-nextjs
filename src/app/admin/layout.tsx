import type { Metadata } from "next";
import type { ReactNode } from "react";

/** Panel administracyjny nigdy nie ma trafić do wyszukiwarek. */
export const metadata: Metadata = {
  title: "Panel administracyjny",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main className="flex-1">{children}</main>;
}
