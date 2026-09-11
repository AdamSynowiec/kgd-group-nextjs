"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import MyAccountPanel from "@/components/admin/MyAccountPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import RolesPanel from "@/components/admin/RolesPanel";
import PermissionsPanel from "@/components/admin/PermissionsPanel";
import Can from "@/components/admin/Can";
import { can } from "@/lib/permissions";
import {
  AdminApiError,
  fetchMe,
  fetchRoles,
  fetchUsers,
  loadSession,
  storeSession,
  type RoleAccount,
  type Session,
  type UserAccount,
} from "@/lib/adminApi";

/**
 * /admin/settings — "Moje konto" (patrz MyAccountPanel.tsx) jest zawsze
 * widoczne, dla KAŻDEGO zalogowanego niezależnie od roli/uprawnień — to nie
 * administracja, tylko własne konto (patrz UsersController::updateOwnAccount()).
 * Konta / Role / Uprawnienia to co innego: gate'owane NIEZALEŻNIE swoim
 * uprawnieniem (users.list / roles.list / roles.permissions.manage — patrz
 * src/lib/permissions.ts, Can.tsx) zamiast jednego wspólnego 403 na cały
 * widok jak wcześniej. Backend jest jedynym źródłem prawdy: to ukrycie
 * sekcji jest konsekwencją brakującego uprawnienia w session.permissions,
 * nie jedynym zabezpieczeniem (patrz Authorization::require() po backendzie).
 */

type ViewState =
  | { status: "checking" }
  | { status: "ready"; users: UserAccount[]; roles: RoleAccount[] }
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
        // Patrz src/app/admin/page.tsx dla tego samego wzorca (i dlaczego
        // /me jest potrzebne nawet gdy currentSession === null).
        const me = await fetchMe(currentSession);
        const nextSession: Session = {
          token: currentSession?.token ?? "",
          login: me.login ?? currentSession?.login ?? "",
          role: me.role ?? currentSession?.role ?? "",
          permissions: me.permissions,
        };
        setSession(nextSession);

        // Role potrzebne zarówno UsersPanel (dropdown), jak i RolesPanel —
        // pobierane, gdy wolno którekolwiek z dwóch powiązanych uprawnień.
        const needsRoles = can(nextSession.permissions, "users.list") || can(nextSession.permissions, "roles.list");

        const [users, roles] = await Promise.all([
          can(nextSession.permissions, "users.list") ? fetchUsers(nextSession) : Promise.resolve<UserAccount[]>([]),
          needsRoles ? fetchRoles(nextSession) : Promise.resolve<RoleAccount[]>([]),
        ]);

        setView({ status: "ready", users, roles });
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) {
          goToLogin();
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

      {view.status === "ready" && (
        <div className="space-y-10">
          <section>
            <MyAccountPanel
              session={session}
              onUpdated={(email) => {
                // Odświeża widoczny w sekcji "Konta" e-mail własnego konta (jeśli
                // ta sekcja jest w ogóle widoczna, patrz users.list niżej) —
                // reszta danych (login/hasło) się nie zmienia z perspektywy listy.
                setView((prev) =>
                  prev.status === "ready" && session
                    ? { ...prev, users: prev.users.map((u) => (u.login === session.login ? { ...u, email } : u)) }
                    : prev
                );
              }}
            />
          </section>
          <Can session={session} permission="users.list">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Konta</h2>
              <UsersPanel initialUsers={view.users} roles={view.roles} session={session} />
            </section>
          </Can>
          <Can session={session} permission="roles.list">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Role</h2>
              <RolesPanel initialRoles={view.roles} session={session} />
            </section>
          </Can>
          <Can session={session} permission="roles.permissions.manage">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Uprawnienia</h2>
              <PermissionsPanel users={view.users} roles={view.roles} session={session} />
            </section>
          </Can>
        </div>
      )}

      {view.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {view.message}
        </div>
      )}
    </AdminShell>
  );
}
