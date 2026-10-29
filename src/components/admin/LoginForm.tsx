"use client";

import { useState } from "react";
import Link from "next/link";
import { ui } from "@/components/admin/ui";

/** Sam formularz — tło i nagłówek daje AuthLayout (src/app/admin/login/page.tsx). */
export default function LoginForm({
  onSubmit,
  errorMessage,
}: {
  onSubmit: (username: string, password: string) => void | Promise<void>;
  errorMessage?: string;
}) {
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && <p className={ui.alertError}>{errorMessage}</p>}
      <div>
        <label htmlFor="admin-login" className={ui.label}>
          Login
        </label>
        <input id="admin-login" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus autoComplete="username" disabled={submitting} className={ui.input} />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="admin-password" className={ui.label}>
            Hasło
          </label>
          <Link href="/admin/reset-hasla/" className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline">
            Nie pamiętasz hasła?
          </Link>
        </div>
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
  );
}
