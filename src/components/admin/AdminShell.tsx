"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { CloseIcon } from "@/components/admin/icons";
import { useMounted } from "@/components/admin/useMounted";
import type { Session } from "@/lib/adminApi";

/**
 * Powłoka dashboardu: stały sidebar (od lg), przezroczysty pasek u góry, treść
 * widoku pośrodku. Na mniejszych ekranach sidebar jest szufladą otwieraną z paska.
 * Sam login (bez sesji) jej nie używa.
 */
export default function AdminShell({
  title,
  session,
  onLogout,
  children,
}: {
  title: string;
  session: Session | null;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Sesja pochodzi z localStorage — przed zamontowaniem renderujemy jak bez sesji (zgodnie z HTML z eksportu).
  const mounted = useMounted();
  const shownSession = mounted ? session : null;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-zinc-200/80 bg-zinc-100/60 lg:block">
        <Sidebar session={shownSession} onLogout={onLogout} />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu panelu">
          <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-zinc-200 bg-zinc-50 shadow-2xl">
            <button onClick={() => setMenuOpen(false)} aria-label="Zamknij menu" className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-200/60">
              <CloseIcon className="h-4 w-4" />
            </button>
            <Sidebar session={shownSession} onLogout={onLogout} onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} session={shownSession} onOpenMenu={() => setMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
