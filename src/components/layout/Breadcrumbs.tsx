import Link from "next/link";
import type { NavLink } from "@/lib/content";

export default function Breadcrumbs({ items }: { items: NavLink[] }) {
  return (
    <nav aria-label="Okruszki" className="mx-auto max-w-5xl px-6 pt-6 text-sm text-zinc-500">
      <ol className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {i === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
