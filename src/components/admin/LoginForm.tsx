"use client";

import { useState } from "react";
import { useBrand } from "@/components/admin/BrandProvider";
import { ui } from "@/components/admin/ui";

export default function LoginForm({
  onSubmit,
  errorMessage,
}: {
  onSubmit: (username: string, password: string) => void | Promise<void>;
  errorMessage?: string;
}) {
  const brand = useBrand();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(username, password);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-lg font-semibold text-white shadow-[0_8px_24px_-6px_rgba(16,24,40,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
          {brand.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900">Zaloguj się do panelu</h1>
        <p className="mt-1.5 text-sm text-zinc-500">{brand.name} — zarządzanie treścią strony</p>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_40px_-12px_rgba(16,24,40,0.12)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && <p className={ui.alertError}>{errorMessage}</p>}
          <div>
            <label htmlFor="admin-login" className={ui.label}>
              Login
            </label>
            <input id="admin-login" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus autoComplete="username" disabled={submitting} className={ui.input} />
          </div>
          <div>
            <label htmlFor="admin-password" className={ui.label}>
              Hasło
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              disabled={submitting}
              className={ui.input}
            />
          </div>
          <button type="submit" disabled={submitting} className={`${ui.btnPrimary} w-full`}>
            {submitting ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">Dostęp tylko dla uprawnionych osób.</p>
    </div>
  );
}
