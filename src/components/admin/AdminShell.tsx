"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import type { Session } from "@/lib/adminApi";

/** Powłoka dashboardu: sidebar po lewej, pasek góra, treść widoku pośrodku. Sam login (bez sesji) jej nie używa. */
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
  return (
    <div className="flex min-h-full bg-zinc-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} session={session} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
