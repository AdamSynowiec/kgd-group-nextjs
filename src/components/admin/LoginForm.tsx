"use client";

import { useState } from "react";
import { useBrand } from "@/components/admin/BrandProvider";

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
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
          {brand.name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-sm font-semibold text-zinc-900">{brand.name} — panel</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Login</label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
            disabled={submitting}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">Hasło</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50"
        >
          {submitting ? "Logowanie..." : "Zaloguj"}
        </button>
      </form>
    </div>
  );
}
