"use client";

import { useState } from "react";
import {
  AdminApiError,
  createUser,
  deleteUser,
  type Session,
  type UserAccount,
} from "@/lib/adminApi";

const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

/**
 * Zarządzanie kontami panelu — dodawanie i usuwanie. Lista przychodzi już
 * wczytana z serwera (patrz /admin/settings), ten komponent tylko trzyma jej
 * lokalną kopię i dogania ją po każdej udanej zmianie, żeby nie robić
 * dodatkowego round-tripu po każdym dodaniu/usunięciu.
 */
export default function UsersPanel({
  initialUsers,
  session,
}: {
  initialUsers: UserAccount[];
  session: Session | null;
}) {
  const [users, setUsers] = useState(initialUsers);

  return (
    <div className="space-y-6">
      <NewUserForm session={session} onCreated={(user) => setUsers((prev) => [...prev, user].sort(byLogin))} />
      <UserList
        users={users}
        session={session}
        onDeleted={(id) => setUsers((prev) => prev.filter((user) => user.id !== id))}
      />
    </div>
  );
}

function byLogin(a: UserAccount, b: UserAccount): number {
  return a.login.localeCompare(b.login);
}

function NewUserForm({
  session,
  onCreated,
}: {
  session: Session | null;
  onCreated: (user: UserAccount) => void;
}) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("editor");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    try {
      const created = await createUser({ login, password, role }, session);
      onCreated({ ...created, createdAt: new Date().toISOString() });
      setLogin("");
      setPassword("");
      setRole("editor");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Nowe konto</h2>

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Login</label>
          <input
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Hasło</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-400">min. 8 znaków</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Rola</label>
          <select value={role} onChange={(event) => setRole(event.target.value)} disabled={submitting} className={inputClass}>
            <option value="editor">Edytor — treść stron</option>
            <option value="admin">Admin — treść + build + konta</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || login.trim() === "" || password === ""}
        className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {submitting ? "Dodawanie..." : "Dodaj konto"}
      </button>
    </form>
  );
}

function UserList({
  users,
  session,
  onDeleted,
}: {
  users: UserAccount[];
  session: Session | null;
  onDeleted: (id: number) => void;
}) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleDelete(user: UserAccount) {
    if (!window.confirm(`Usunąć konto "${user.login}"? Tej operacji nie da się cofnąć.`)) {
      return;
    }

    setPendingId(user.id);
    setErrorMessage("");
    try {
      await deleteUser(user.id, session);
      onDeleted(user.id);
    } catch (error) {
      const message =
        error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.";
      setErrorMessage(message);
    } finally {
      setPendingId(null);
    }
  }

  if (users.length === 0) {
    return <p className="text-sm text-zinc-500">Brak kont.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {errorMessage && (
        <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      )}
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {users.map((user) => {
          const isSelf = session?.login === user.login;
          return (
            <li key={user.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-zinc-900 dark:text-white">{user.login}</span>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {user.role}
                  </span>
                  {isSelf && (
                    <span className="shrink-0 text-xs text-zinc-400">to Ty</span>
                  )}
                </div>
                <div className="truncate text-sm text-zinc-500">utworzono: {user.createdAt}</div>
              </div>
              <button
                onClick={() => handleDelete(user)}
                disabled={isSelf || pendingId === user.id}
                title={isSelf ? "Nie możesz usunąć własnego konta." : undefined}
                className="shrink-0 rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                {pendingId === user.id ? "Usuwanie..." : "Usuń"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
