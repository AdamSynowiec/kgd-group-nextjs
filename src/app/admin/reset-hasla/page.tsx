"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/admin/AuthLayout";
import { ui } from "@/components/admin/ui";
import { forgotPassword, resetPassword } from "@/lib/adminApi";

const MIN_PASSWORD = 8;

/**
 * Reset hasła (AccountController.php): bez ?token= — prośba o link na potwierdzony adres konta,
 * z ?token= (link z maila) — ustawienie nowego hasła. Odpowiedź na prośbę jest zawsze ta sama,
 * żeby nie zdradzać, które loginy istnieją.
 */
export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");
    if (value) window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- odczyt adresu dopiero po zamontowaniu (eksport statyczny)
    setToken(value);
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Coś poszło nie tak.");
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <Link href="/admin/login/" className="underline-offset-2 hover:text-zinc-600 hover:underline">
      Wróć do logowania
    </Link>
  );

  if (token === undefined) {
    return (
      <AuthLayout title="Hasło">
        <div className="h-32 animate-pulse rounded-lg bg-zinc-100" aria-busy="true" />
      </AuthLayout>
    );
  }

  if (token) {
    return (
      <AuthLayout title="Ustaw nowe hasło" footer={done ? undefined : footer}>
        {done ? (
          <div className="space-y-5">
            <p className={ui.alertSuccess}>Hasło zostało zmienione. Zaloguj się nowym hasłem.</p>
            <Link href="/admin/login/" className={`${ui.btnPrimary} w-full`}>
              Zaloguj się
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (password !== repeat) {
                setError("Powtórzone hasło nie zgadza się z nowym.");
                return;
              }
              void run(() => resetPassword(token, password));
            }}
            className="space-y-5"
          >
            {error && <p className={ui.alertError}>{error}</p>}
            <div>
              <label htmlFor="new-password" className={ui.label}>
                Nowe hasło
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={MIN_PASSWORD}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                autoFocus
                disabled={busy}
                className={ui.input}
              />
              <p className={ui.hint}>Co najmniej {MIN_PASSWORD} znaków.</p>
            </div>
            <div>
              <label htmlFor="repeat-password" className={ui.label}>
                Powtórz hasło
              </label>
              <input
                id="repeat-password"
                type="password"
                required
                value={repeat}
                onChange={(event) => setRepeat(event.target.value)}
                autoComplete="new-password"
                disabled={busy}
                className={ui.input}
              />
            </div>
            <button type="submit" disabled={busy || password.length < MIN_PASSWORD || repeat === ""} className={`${ui.btnPrimary} w-full`}>
              {busy ? "Zapisywanie…" : "Ustaw hasło"}
            </button>
          </form>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nie pamiętasz hasła?" footer={footer}>
      {done ? (
        <p className={ui.alertSuccess}>
          Jeśli konto istnieje i ma potwierdzony adres e-mail, wysłaliśmy na niego link do ustawienia nowego hasła. Link jest ważny 1 godzinę.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => forgotPassword(login.trim()));
          }}
          className="space-y-5"
        >
          <p className="text-sm text-zinc-600">Podaj login albo adres e-mail konta — wyślemy link do ustawienia nowego hasła.</p>
          {error && <p className={ui.alertError}>{error}</p>}
          <div>
            <label htmlFor="reset-login" className={ui.label}>
              Login lub e-mail
            </label>
            <input
              id="reset-login"
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              autoComplete="username"
              autoFocus
              disabled={busy}
              className={ui.input}
            />
          </div>
          <button type="submit" disabled={busy || login.trim() === ""} className={`${ui.btnPrimary} w-full`}>
            {busy ? "Wysyłanie…" : "Wyślij link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
