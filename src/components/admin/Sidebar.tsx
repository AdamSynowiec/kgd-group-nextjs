"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalIcon, LogoutIcon, PagesIcon, SettingsIcon } from "@/components/admin/icons";
import { useBrand } from "@/components/admin/BrandProvider";
import { can, type Permission } from "@/lib/permissions";
import type { Session } from "@/lib/adminApi";

// Blog to zwykłe strony w `pages` (parent:"/blog") — bez osobnej zakładki,
// widoczne na liście "Strony" jak każda inna podstrona (patrz PageList.tsx).
// "Strony" wymaga pages.list. "Ustawienia" NIE ma "anyOf" — zawsze widoczne
// dla każdego zalogowanego, bo od "Moje konto" (MyAccountPanel.tsx, zawsze
// dostępne, żadnego uprawnienia) w dół ma teraz zawsze jakąś treść, nawet
// bez users.list/roles.list/roles.permissions.manage (patrz
// src/app/admin/settings/page.tsx).
const NAV_GROUPS: { title: string; items: { label: string; href: string; Icon: typeof PagesIcon; anyOf?: Permission[] }[] }[] = [
  { title: "Treść", items: [{ label: "Strony", href: "/admin", Icon: PagesIcon, anyOf: ["pages.list"] }] },
  { title: "System", items: [{ label: "Ustawienia", href: "/admin/settings", Icon: SettingsIcon }] },
];

/** Nawigacja panelu — na desktopie stała kolumna, na telefonie ta sama treść w szufladzie (AdminShell). */
export default function Sidebar({ session, onLogout, onNavigate }: { session: Session | null; onLogout: () => void; onNavigate?: () => void }) {
  const brand = useBrand();
  const pathname = usePathname();
  const displayName = session?.login || "Gość";

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]">
          {brand.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight text-zinc-900">{brand.name}</div>
          <div className="text-[11px] leading-tight text-zinc-500">Panel treści</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Nawigacja panelu">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.anyOf || item.anyOf.some((permission) => can(session?.permissions, permission)));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">{group.title}</div>
              <div className="space-y-0.5">
                {items.map(({ label, href, Icon }) => {
                  const active = pathname === href || pathname === `${href}/`;
                  return (
                    <Link
                      key={label}
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200/80" : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900"
                      }`}
                    >
                      {active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500" />}
                      <Icon className={`h-[18px] w-[18px] ${active ? "text-indigo-600" : "text-zinc-400 group-hover:text-zinc-600"}`} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div>
          <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">Strona</div>
          <a href="/" target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-200/50 hover:text-zinc-900">
            <ExternalIcon className="h-[18px] w-[18px] text-zinc-400 group-hover:text-zinc-600" />
            Otwórz stronę
          </a>
        </div>
      </nav>

      <div className="shrink-0 border-t border-zinc-200/80 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-900">{displayName}</div>
            <div className="truncate text-xs text-zinc-500">{session?.role || "niezalogowany"}</div>
          </div>
          {session && (
            <button onClick={onLogout} title="Wyloguj" aria-label="Wyloguj" className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-200/60 hover:text-zinc-900">
              <LogoutIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
