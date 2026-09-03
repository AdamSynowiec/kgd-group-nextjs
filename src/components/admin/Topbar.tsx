"use client";

import { useEffect, useRef, useState } from "react";
import BuildButton from "@/components/admin/BuildButton";
import { ChevronDownIcon } from "@/components/admin/icons";
import type { Session } from "@/lib/adminApi";

export default function Topbar({
  title,
  session,
  onLogout,
}: {
  title: string;
  session: Session | null;
  onLogout: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Brak sesji = logowanie wyłączone (tryb developerski) — pokazuj wszystko,
  // tak jak backend, który w tym trybie też nic nie blokuje (patrz SessionAuth::requireRole()).
  const canBuild = session === null || session.role === "admin";
  const displayName = session?.login || "Gość";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6">
      <h1 className="truncate text-base font-semibold text-zinc-900">{title}</h1>

      <div className="flex items-center gap-4">
        {canBuild && <BuildButton session={session} />}

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-zinc-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white">
              {initial}
            </span>
            <span className="hidden text-sm font-medium text-zinc-700 sm:inline">
              {displayName}
            </span>
            <ChevronDownIcon className="h-4 w-4 text-zinc-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <div className="border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
                Zalogowano jako
                <div className="truncate font-medium text-zinc-700">
                  {displayName}
                  {session && <span className="text-zinc-400"> · {session.role}</span>}
                </div>
              </div>
              {session ? (
                <button
                  onClick={onLogout}
                  className="block w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Wyloguj
                </button>
              ) : (
                <p className="px-4 py-2 text-sm text-zinc-400">Logowanie wyłączone</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
