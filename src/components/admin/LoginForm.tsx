"use client";

import { useState } from "react";

export default function LoginForm({
  onSubmit,
  errorMessage,
}: {
  onSubmit: (username: string, password: string) => void;
  errorMessage?: string;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(username, password);
      }}
      className="mx-auto mt-16 max-w-sm space-y-4"
    >
      <h2 className="text-lg font-semibold">Logowanie do panelu</h2>
      {errorMessage && <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      <div>
        <label className="mb-1 block text-sm font-medium">Login</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoFocus
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Hasło</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Zaloguj
      </button>
    </form>
  );
}
