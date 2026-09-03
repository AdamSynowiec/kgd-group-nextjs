import Link from "next/link";
import { getSite } from "@/lib/content";

export default function SiteHeader() {
  const site = getSite();

  return (
    <header className="border-b border-black/[.06]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          {site.brand.name}
        </Link>
        <nav className="flex gap-6 text-sm">
          {site.nav.primary.map((item) => (
            <Link key={item.href} href={item.href} className="text-zinc-600 hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
