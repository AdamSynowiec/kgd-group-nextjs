"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PagesIcon, SettingsIcon } from "@/components/admin/icons";
import { useBrand } from "@/components/admin/BrandProvider";
import { can, type Permission } from "@/lib/permissions";
import type { Session } from "@/lib/adminApi";

// Blog to zwykłe strony w `pages` (parent:"/blog") — bez osobnej zakładki,
// widoczne na liście "Strony" jak każda inna podstrona (patrz PageList.tsx).
// "Strony" wymaga pages.list; "Ustawienia" pokazuje się, gdy wolno choć
// jedno z uprawnień jej trzech sekcji (patrz src/app/admin/settings/page.tsx)
// — samo wejście na pustą, w pełni zablokowaną stronę nie ma sensu pokazywać.
const NAV_ITEMS: { label: string; href: string; Icon: typeof PagesIcon; anyOf: Permission[] }[] = [
  { label: "Strony", href: "/admin", Icon: PagesIcon, anyOf: ["pages.list"] },
  {
    label: "Ustawienia",
    href: "/admin/settings",
    Icon: SettingsIcon,
    anyOf: ["users.list", "roles.list", "roles.permissions.manage"],
  },
];

export default function Sidebar({ session }: { session: Session | null }) {
  const brand = useBrand();
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.anyOf.some((permission) => can(session?.permissions, permission)));

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
          {brand.name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-sm font-semibold text-zinc-900">{brand.name}</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {items.map(({ label, href, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex w-full items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900"
                  : "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
