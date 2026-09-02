"use client";

import { PagesIcon, SettingsIcon } from "@/components/admin/icons";
import { useBrand } from "@/components/admin/BrandProvider";

/**
 * Lista nawigacji — na razie jedna prawdziwa pozycja ("Strony"). Kolejne
 * sekcje CMS-a (Media, Użytkownicy...) dopisuje się tu jako kolejny wpis;
 * "active: false" renderuje pozycję jako zapowiedź, nie martwy link.
 */
const NAV_ITEMS = [{ label: "Strony", Icon: PagesIcon, active: true }] as const;

const UPCOMING_ITEMS = [{ label: "Ustawienia", Icon: SettingsIcon }] as const;

export default function Sidebar() {
  const brand = useBrand();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white sm:flex dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
          {brand.name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{brand.name}</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map(({ label, Icon, active }) => (
          <button
            key={label}
            type="button"
            aria-current={active ? "page" : undefined}
            className="flex w-full items-center gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-800 dark:text-white"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}

        <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Wkrótce</p>

        {UPCOMING_ITEMS.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex w-full cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
          >
            <Icon className="h-4 w-4" />
            {label}
          </div>
        ))}
      </nav>
    </aside>
  );
}
