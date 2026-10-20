"use client";

import BuildButton from "@/components/admin/BuildButton";
import { MenuIcon } from "@/components/admin/icons";
import { can } from "@/lib/permissions";
import type { Session } from "@/lib/adminApi";

/** Górny pasek: tytuł widoku + budowanie strony; na telefonie dodatkowo przycisk menu (Sidebar w szufladzie). */
export default function Topbar({ title, session, onOpenMenu }: { title: string; session: Session | null; onOpenMenu: () => void }) {
  // session.permissions przychodzi świeże z GET /me (patrz src/app/admin/page.tsx),
  // nie z samej roli w tokenie — nawet gdy session === null (dev:
  // ADMIN_AUTH_ENABLED=false), /me i tak zwraca permissions:["*"], więc
  // można tu po prostu ufać can() bez osobnego przypadku na null.
  const canBuild = can(session?.permissions, "build.trigger");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onOpenMenu} aria-label="Otwórz menu" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 lg:hidden">
          <MenuIcon className="h-5 w-5" />
        </button>
        <h1 className="truncate text-[15px] font-semibold tracking-tight text-zinc-900">{title}</h1>
      </div>

      {canBuild && <BuildButton session={session} />}
    </header>
  );
}
