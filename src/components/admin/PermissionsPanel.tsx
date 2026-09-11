"use client";

import { useEffect, useState } from "react";
import {
  AdminApiError,
  denyUserPermission,
  fetchRolePermissions,
  fetchUserPermissions,
  undenyUserPermission,
  updateRolePermissions,
  type RoleAccount,
  type Session,
  type UserAccount,
  type UserPermissions,
} from "@/lib/adminApi";
import { PERMISSIONS } from "@/lib/permissions";

const selectClass = "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Sekcja "Uprawnienia": (1) grid rola->uprawnienia (checkboxy, zapis per
 * rola — patrz PermissionsController::updateRolePermissions(), nadpisuje
 * CAŁY zestaw naraz), (2) podgląd/edycja efektywnych uprawnień jednego konta
 * z odznaką źródła i przyciskiem odbierz/przywróć. BRAK jakiejkolwiek
 * kontrolki "nadaj indywidualnie" — jedyna operacja na pojedynczym userze to
 * odebranie (deny) albo przywrócenie (usunięcie deny) uprawnienia, którego
 * już i tak udziela jego rola (patrz src/lib/permissions.ts).
 */
export default function PermissionsPanel({
  users,
  roles,
  session,
}: {
  users: UserAccount[];
  roles: RoleAccount[];
  session: Session | null;
}) {
  return (
    <div className="space-y-8">
      <RoleGrid roles={roles} session={session} />
      <UserPermissionsView users={users} session={session} />
    </div>
  );
}

function RoleGrid({ roles, session }: { roles: RoleAccount[]; session: Session | null }) {
  const [grants, setGrants] = useState<Record<string, string[]> | null>(null);
  const [pending, setPending] = useState<Record<string, string[]>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchRolePermissions(session)
      .then((data) => {
        if (!cancelled) setGrants(data.grants);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (errorMessage) {
    return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>;
  }

  if (grants === null) {
    return <p className="text-sm text-zinc-500">Wczytywanie...</p>;
  }

  function currentFor(roleName: string): string[] {
    return pending[roleName] ?? grants![roleName] ?? [];
  }

  function toggle(roleName: string, permission: string) {
    const current = currentFor(roleName);
    const next = current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission];
    setPending((prev) => ({ ...prev, [roleName]: next }));
  }

  async function save(roleName: string) {
    setSavingRole(roleName);
    setErrorMessage("");
    try {
      const result = await updateRolePermissions(roleName, currentFor(roleName), session);
      setGrants((prev) => ({ ...(prev ?? {}), [roleName]: result.permissions }));
      setPending((prev) => {
        const next = { ...prev };
        delete next[roleName];
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.");
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-zinc-900">Uprawnienia ról</h3>
      <p className="mb-4 text-xs text-zinc-500">
        Rola &quot;admin&quot; ma zawsze pełny dostęp — jej zestawu nie da się tu edytować. Nowa rola bez zaznaczeń nie pozwala na nic
        poza zalogowaniem.
      </p>
      <div className="space-y-4">
        {roles.map((role) => {
          const isAdmin = role.name === "admin";
          const current = isAdmin ? ["*"] : currentFor(role.name);
          const dirty = !isAdmin && pending[role.name] !== undefined;

          return (
            <div key={role.name} className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-zinc-900">{role.label}</span>
                  <span className="ml-2 font-mono text-xs text-zinc-400">{role.name}</span>
                </div>
                {!isAdmin && (
                  <button
                    onClick={() => save(role.name)}
                    disabled={!dirty || savingRole === role.name}
                    className="rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40"
                  >
                    {savingRole === role.name ? "Zapisywanie..." : "Zapisz"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {isAdmin ? (
                  <span className="col-span-full text-sm text-zinc-500">* (wszystkie uprawnienia)</span>
                ) : (
                  PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        className="h-4 w-4 border-zinc-300"
                        checked={current.includes(permission)}
                        onChange={() => toggle(role.name, permission)}
                      />
                      <span className="font-mono text-xs">{permission}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          );
        })}
        {roles.length === 0 && <p className="text-sm text-zinc-500">Brak ról.</p>}
      </div>
    </div>
  );
}

function UserPermissionsView({ users, session }: { users: UserAccount[]; session: Session | null }) {
  const [selectedId, setSelectedId] = useState<number | "">(users[0]?.id ?? "");
  const [data, setData] = useState<UserPermissions | null>(null);
  const [pendingPermission, setPendingPermission] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Brak wyboru (np. lista kont pusta) — nic do pobrania; poprzednie "data"
    // (jeśli jakieś zostało) zostaje niewyrenderowane, bo widok niżej i tak
    // sprawdza selectedId !== "" przed pokazaniem czegokolwiek.
    if (selectedId === "") return;

    let cancelled = false;
    fetchUserPermissions(selectedId, session)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setErrorMessage("");
        }
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, session]);

  async function toggleDeny(permission: string, currentlyDenied: boolean) {
    if (selectedId === "") return;
    setPendingPermission(permission);
    setErrorMessage("");
    try {
      if (currentlyDenied) {
        await undenyUserPermission(selectedId, permission, session);
      } else {
        await denyUserPermission(selectedId, permission, session);
      }
      const refreshed = await fetchUserPermissions(selectedId, session);
      setData(refreshed);
    } catch (error) {
      setErrorMessage(error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.");
    } finally {
      setPendingPermission(null);
    }
  }

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-zinc-900">Uprawnienia konta</h3>
      <p className="mb-4 text-xs text-zinc-500">
        Odebranie (deny) blokuje jedno konkretne uprawnienie mimo roli. Przywrócenie usuwa blokadę — dostęp wraca, jeśli rola nadal go
        daje. Brak możliwości nadania czegoś, czego rola nie daje.
      </p>

      <div className="mb-4 max-w-xs">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value === "" ? "" : Number(event.target.value))}
          className={selectClass}
        >
          {users.length === 0 && <option value="">Brak kont</option>}
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.login} ({user.role})
            </option>
          ))}
        </select>
      </div>

      {errorMessage && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      {selectedId !== "" && data && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {PERMISSIONS.map((permission) => {
              const grantedByRole = data.granted.includes(permission) || data.granted.includes("*");
              const denied = data.denied.includes(permission);
              const effective = grantedByRole && !denied;

              return (
                <li key={permission} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <span className="font-mono text-sm text-zinc-800">{permission}</span>
                    <div className="mt-0.5 text-xs">
                      {effective && <span className="text-green-600">dostęp — z roli &quot;{data.role}&quot;</span>}
                      {!effective && grantedByRole && denied && <span className="text-red-600">odebrane indywidualnie</span>}
                      {!effective && !grantedByRole && (
                        <span className="text-zinc-400">brak — rola &quot;{data.role}&quot; tego nie daje</span>
                      )}
                    </div>
                  </div>

                  {grantedByRole && (
                    <button
                      onClick={() => toggleDeny(permission, denied)}
                      disabled={pendingPermission === permission}
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                        denied
                          ? "border-green-200 text-green-700 hover:bg-green-50"
                          : "border-red-200 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {pendingPermission === permission ? "..." : denied ? "Przywróć" : "Odbierz"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
