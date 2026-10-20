"use client";

import { useState } from "react";
import { AdminApiError, createRole, deleteRole, type RoleAccount, type Session } from "@/lib/adminApi";
import { can } from "@/lib/permissions";
import Can from "@/components/admin/Can";
import { ui } from "@/components/admin/ui";

const inputClass = ui.input;

/**
 * Zarządzanie rolami — dodawanie i usuwanie, mirror UsersPanel.tsx. "name"
 * (nazwa techniczna, patrz db/010_create_roles_table.sql) jest niezmienna po
 * utworzeniu — stąd brak formularza edycji, tylko tworzenie/usuwanie.
 */
export default function RolesPanel({ initialRoles, session }: { initialRoles: RoleAccount[]; session: Session | null }) {
  const [roles, setRoles] = useState(initialRoles);

  return (
    <div className="space-y-6">
      <Can session={session} permission="roles.create">
        <NewRoleForm session={session} onCreated={(role) => setRoles((prev) => [...prev, role].sort(byName))} />
      </Can>
      <RoleList roles={roles} session={session} onDeleted={(name) => setRoles((prev) => prev.filter((role) => role.name !== name))} />
    </div>
  );
}

function byName(a: RoleAccount, b: RoleAccount): number {
  return a.name.localeCompare(b.name);
}

function NewRoleForm({ session, onCreated }: { session: Session | null; onCreated: (role: RoleAccount) => void }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    try {
      const created = await createRole({ name: name.trim().toLowerCase(), label: label.trim() }, session);
      onCreated({ ...created, createdAt: new Date().toISOString() });
      setName("");
      setLabel("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${ui.card} space-y-4 p-6`}>
      <h2 className="text-sm font-semibold text-zinc-900">Nowa rola</h2>

      {errorMessage && <p className={ui.alertError}>{errorMessage}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label}>Nazwa techniczna</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={submitting}
            placeholder="np. marketing"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-400">Małe litery, cyfry, &quot;-&quot;/&quot;_&quot;. Nie da się jej później zmienić.</p>
        </div>
        <div>
          <label className={ui.label}>Etykieta</label>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={submitting}
            placeholder="np. Marketing — treść kampanii"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || name.trim() === "" || label.trim() === ""}
        className={ui.btnPrimary}
      >
        {submitting ? "Dodawanie..." : "Dodaj rolę"}
      </button>
    </form>
  );
}

function RoleList({
  roles,
  session,
  onDeleted,
}: {
  roles: RoleAccount[];
  session: Session | null;
  onDeleted: (name: string) => void;
}) {
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete(role: RoleAccount) {
    if (!window.confirm(`Usunąć rolę "${role.label}" (${role.name})? Tej operacji nie da się cofnąć.`)) {
      return;
    }

    setPendingName(role.name);
    setErrorMessage("");
    try {
      await deleteRole(role.name, session);
      onDeleted(role.name);
    } catch (error) {
      const message = error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.";
      setErrorMessage(message);
    } finally {
      setPendingName(null);
    }
  }

  if (roles.length === 0) {
    return <p className="text-sm text-zinc-500">Brak ról.</p>;
  }

  return (
    <div className={`${ui.card} overflow-hidden`}>
      {errorMessage && <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</p>}
      <ul className="divide-y divide-zinc-100">
        {roles.map((role) => {
          const isAdmin = role.name === "admin";
          return (
            <li key={role.name} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-zinc-900">{role.label}</span>
                  <span className={`${ui.badge} ${ui.badgeNeutral} shrink-0`}>{role.name}</span>
                </div>
                <div className="truncate text-sm text-zinc-500">utworzono: {role.createdAt}</div>
              </div>
              {can(session?.permissions, "roles.delete") && (
                <button
                  onClick={() => handleDelete(role)}
                  disabled={isAdmin || pendingName === role.name}
                  title={isAdmin ? 'Roli "admin" nie można usunąć.' : undefined}
                  className={`${ui.btnDanger} shrink-0`}
                >
                  {pendingName === role.name ? "Usuwanie..." : "Usuń"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
