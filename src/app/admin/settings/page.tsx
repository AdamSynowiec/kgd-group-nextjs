"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import MyAccountPanel from "@/components/admin/MyAccountPanel";
import UsersPanel from "@/components/admin/UsersPanel";
import RolesPanel from "@/components/admin/RolesPanel";
import PermissionsPanel from "@/components/admin/PermissionsPanel";
import ActivityLogPanel from "@/components/admin/ActivityLogPanel";
import PriceReportsPanel from "@/components/admin/PriceReportsPanel";
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
 * /admin/settings — jedna zakładka na kategorię ("Moje konto"/"Konta"/"Role"/
 * "Uprawnienia"/"Aktywność"), zamiast wszystkiego na raz pod sobą — każda
 * kategoria to osobne zarządzanie, łatwiej się w tym poruszać niż w jednej
 * długiej stronie. Lista dostępnych zakładek (tabs, niżej) to jedyne miejsce
 * decydujące, co się w ogóle pokazuje — "Moje konto" zawsze (to nie
 * administracja, tylko własne konto, patrz MyAccountPanel.tsx/
 * UsersController::updateOwnAccount()), reszta wg uprawnienia
 * (users.list/roles.list/roles.permissions.manage/activity.list — patrz
 * src/lib/permissions.ts; "activity.list" domyślnie ma tylko rola "admin").
 * Backend jest jedynym źródłem prawdy: to ukrycie zakładki jest konsekwencją
 * brakującego uprawnienia w session.permissions, nie jedynym zabezpieczeniem
 * (patrz Authorization::require() po stronie backendu).
 */

type TabKey = "account" | "users" | "roles" | "permissions" | "activity" | "reports";

type ViewState =
  | { status: "checking" }
  | { status: "ready"; users: UserAccount[]; roles: RoleAccount[] }
  | { status: "error"; message: string };

export default function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<ViewState>({ status: "checking" });
  const [activeTab, setActiveTab] = useState<TabKey>("account");

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

  const tabs = useMemo(() => {
    const list: { key: TabKey; label: string }[] = [{ key: "account", label: "Moje konto" }];
    if (can(session?.permissions, "users.list")) list.push({ key: "users", label: "Konta" });
    if (can(session?.permissions, "roles.list")) list.push({ key: "roles", label: "Role" });
    if (can(session?.permissions, "roles.permissions.manage")) list.push({ key: "permissions", label: "Uprawnienia" });
    if (can(session?.permissions, "reports.list")) list.push({ key: "reports", label: "Raportowanie cen" });
    if (can(session?.permissions, "activity.list")) list.push({ key: "activity", label: "Aktywność" });
    return list;
  }, [session]);

  // Zakładka mogła przestać być dostępna (np. po odświeżeniu /me po zmianie
  // uprawnień) — wróć wtedy na zawsze-dostępne "Moje konto" zamiast pokazywać puste.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- korekta stanu po zmianie zewnętrznych danych (session.permissions), nie kaskada renderów
    if (!tabs.some((tab) => tab.key === activeTab)) setActiveTab("account");
  }, [tabs, activeTab]);

  return (
    <AdminShell title="Ustawienia" session={session} onLogout={goToLogin}>
      {view.status === "checking" && (
        <div className="max-w-5xl animate-pulse space-y-4" aria-busy="true">
          <div className="h-7 w-40 rounded-md bg-zinc-200/80" />
          <div className="h-9 w-80 rounded-lg bg-zinc-200/60" />
          <div className="h-56 rounded-xl bg-zinc-200/50" />
        </div>
      )}

      {view.status === "ready" && (
        <div className="max-w-5xl">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Ustawienia</h2>
            <p className="mt-1 text-sm text-zinc-500">Twoje konto, użytkownicy panelu, role i uprawnienia.</p>
          </div>
          <div className="mb-6 overflow-x-auto">
            <div className="inline-flex gap-1 rounded-lg bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200/60" role="tablist" aria-label="Sekcje ustawień">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-current={activeTab === tab.key ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-[13px] font-medium transition ${
                    activeTab === tab.key ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-zinc-200/80" : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "account" && (
            <MyAccountPanel
              session={session}
              onUpdated={(email) => {
                // Odświeża widoczny na zakładce "Konta" e-mail własnego konta
                // (jeśli ta zakładka jest w ogóle dostępna) — reszta danych
                // (login/hasło) się nie zmienia z perspektywy listy.
                setView((prev) =>
                  prev.status === "ready" && session
                    ? { ...prev, users: prev.users.map((u) => (u.login === session.login ? { ...u, email } : u)) }
                    : prev
                );
              }}
            />
          )}
          {activeTab === "users" && <UsersPanel initialUsers={view.users} roles={view.roles} session={session} />}
          {activeTab === "roles" && <RolesPanel initialRoles={view.roles} session={session} />}
          {activeTab === "permissions" && <PermissionsPanel users={view.users} roles={view.roles} session={session} />}
          {activeTab === "reports" && <PriceReportsPanel session={session} />}
          {activeTab === "activity" && <ActivityLogPanel session={session} />}
        </div>
      )}

      {view.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {view.message}
        </div>
      )}
    </AdminShell>
  );
}
