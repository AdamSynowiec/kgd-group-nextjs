"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AssetLibrary from "@/components/admin/assets/AssetLibrary";
import { can } from "@/lib/permissions";
import { AdminApiError, fetchMe, loadSession, storeSession, type Session } from "@/lib/adminApi";

/**
 * /admin/assets — biblioteka wgranych plików: katalogi, przenoszenie, usuwanie
 * (AssetLibrary.tsx, AssetController.php). Sesja i
 * uprawnienia odświeżane z GET /me jak w src/app/admin/settings/page.tsx.
 */
export default function AdminAssetsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [state, setState] = useState<"checking" | "ready" | "forbidden" | { error: string }>("checking");

  const goToLogin = useCallback(() => {
    storeSession(null);
    setSession(null);
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    const current = session;
    fetchMe(current)
      .then((me) => {
        const next: Session = { token: current?.token ?? "", login: me.login ?? current?.login ?? "", role: me.role ?? current?.role ?? "", permissions: me.permissions };
        setSession(next);
        setState(can(next.permissions, "assets.list") ? "ready" : "forbidden");
      })
      .catch((error) => {
        if (error instanceof AdminApiError && error.status === 401) {
          goToLogin();
          return;
        }
        setState({ error: error instanceof Error ? error.message : "Nieznany błąd." });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tylko przy montowaniu
  }, []);

  return (
    <AdminShell title="Assets" session={session} onLogout={goToLogin}>
      <div>
        {state === "checking" && <div className="h-40 animate-pulse rounded-xl bg-zinc-200/60" />}
        {state === "ready" && <AssetLibrary session={session} />}
        {state === "forbidden" && <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Nie masz uprawnienia do biblioteki plików (assets.list).</p>}
        {typeof state === "object" && <p className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{state.error}</p>}
      </div>
    </AdminShell>
  );
}
