"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import UsersPanel from "@/components/admin/UsersPanel";
import { AdminApiError, fetchUsers, loadSession, storeSession, type Session, type UserAccount } from "@/lib/adminApi";

/**
 * /admin/settings — na razie tylko zarządzanie kontami panelu. Backend jest
 * jedynym źródłem prawdy o dostępie (rola "admin" — patrz UsersController.php
 * i admin.php); "session === null" to tryb developerski z wyłączonym
 * logowaniem (ADMIN_AUTH_ENABLED=false), w którym backend też niczego nie
 * blokuje — patrz Topbar.tsx po ten sam warunek dla przycisku builda.
 */

type ViewState =
  | { status: "checking" }
  | { status: "forbidden" }
  | { status: "ready"; users: UserAccount[] }
  | { status: "error"; message: string };

export default function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<ViewState>({ status: "checking" });

  const goToLogin = useCallback(() => {
    storeSession(null);
    setSession(null);
    router.replace("/admin/login");
  }, [router]);

  const load = useCallback(
    async (currentSession: Session | null) => {
      setView({ status: "checking" });
      try {
        const users = await fetchUsers(currentSession);
        setView({ status: "ready", users });
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) {
          goToLogin();
          return;
        }
        if (error instanceof AdminApiError && error.status === 403) {
          setView({ status: "forbidden" });
          return;
        }
        setView({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
      }
    },
    [goToLogin]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch danych przy montowaniu, patrz src/app/admin/page.tsx
    void load(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ma się uruchomić tylko raz, przy montowaniu
  }, []);

  return (
    <AdminShell title="Ustawienia" session={session} onLogout={goToLogin}>
      {view.status === "checking" && <p className="text-sm text-zinc-500">Wczytywanie...</p>}

      {view.status === "forbidden" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Zarządzanie kontami wymaga roli &quot;admin&quot;.
        </div>
      )}

      {view.status === "ready" && <UsersPanel initialUsers={view.users} session={session} />}

      {view.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {view.message}
        </div>
      )}
    </AdminShell>
  );
}
