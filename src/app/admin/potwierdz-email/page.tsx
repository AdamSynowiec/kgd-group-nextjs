"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/admin/AuthLayout";
import { ui } from "@/components/admin/ui";
import {
  AdminApiError,
  fetchAccountEmail,
  loadSession,
  requestEmailVerification,
  storeSession,
  verifyEmail,
  type AccountEmailStatus,
} from "@/lib/adminApi";

type View =
  | { status: "loading" }
  | { status: "form"; account: AccountEmailStatus }
  | { status: "sent"; account: AccountEmailStatus }
  | { status: "verified"; email: string }
  | { status: "error"; message: string };

/**
 * Obowiązkowe podanie i potwierdzenie adresu e-mail konta (AccountController.php, db/039). Backend
 * nie odpowiada na nic innego, dopóki adres nie jest potwierdzony — tego ekranu nie da się pominąć,
 * panel tylko tu przenosi (adminApi.ts). Ten sam adres obsługuje link z maila (?token=…), także
 * bez zalogowania, np. otwarty w innej przeglądarce.
 */
export default function ConfirmEmailPage() {
  const router = useRouter();
  const [view, setView] = useState<View>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    storeSession(null);
    router.replace("/admin/login");
  }, [router]);

  const refresh = useCallback(async () => {
    const session = loadSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }
    try {
      const account = await fetchAccountEmail(session);
      if (account.emailVerified && !account.pendingEmail) {
        router.replace("/admin");
        return;
      }
      setEmail((current) => current || account.pendingEmail || "");
      setView({ status: account.pendingEmail ? "sent" : "form", account });
    } catch (err) {
      if (err instanceof AdminApiError && err.status === 401) {
        logout();
        return;
      }
      setView({ status: "error", message: err instanceof Error ? err.message : "Nie udało się wczytać konta." });
    }
  }, [router, logout]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pobranie stanu konta przy montowaniu, patrz src/app/admin/page.tsx
      void refresh();
      return;
    }
    // Token nie powinien zostać w historii ani w nagłówku Referer.
    window.history.replaceState(null, "", window.location.pathname);
    verifyEmail(token)
      .then((result) => setView({ status: "verified", email: result.email }))
      .catch((err) => setView({ status: "error", message: err instanceof Error ? err.message : "Nie udało się potwierdzić adresu." }));
  }, [refresh]);

  // Link zwykle otwiera się w nowej karcie — po powrocie do tej sprawdź, czy adres jest już potwierdzony.
  useEffect(() => {
    if (view.status !== "sent") return;
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [view.status, refresh]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const account = await requestEmailVerification({ email: email.trim(), currentPassword: password }, loadSession());
      setPassword("");
      setView({ status: "sent", account });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wysłać linku.");
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <button type="button" onClick={logout} className="underline-offset-2 hover:text-zinc-600 hover:underline">
      Wyloguj się
    </button>
  );

  if (view.status === "loading") {
    return (
      <AuthLayout title="Adres e-mail">
        <div className="h-32 animate-pulse rounded-lg bg-zinc-100" aria-busy="true" />
      </AuthLayout>
    );
  }

  if (view.status === "verified") {
    const loggedIn = loadSession() !== null;
    return (
      <AuthLayout title="Adres potwierdzony">
        <div className="space-y-5">
          <p className={ui.alertSuccess}>
            Adres <strong>{view.email}</strong> jest potwierdzony. Na niego możesz od teraz przywracać hasło.
          </p>
          <Link href={loggedIn ? "/admin/" : "/admin/login/"} className={`${ui.btnPrimary} w-full`}>
            {loggedIn ? "Przejdź do panelu" : "Zaloguj się"}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (view.status === "error") {
    return (
      <AuthLayout title="Adres e-mail">
        <div className="space-y-5">
          <p className={ui.alertError}>{view.message}</p>
          <button
            type="button"
            onClick={() => {
              setView({ status: "loading" });
              void refresh();
            }}
            className={`${ui.btnSecondary} w-full`}
          >
            Wyślij nowy link
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (view.status === "sent") {
    return (
      <AuthLayout title="Sprawdź skrzynkę" subtitle="Ostatni krok przed wejściem do panelu" footer={footer}>
        <div className="space-y-5">
          <p className="text-sm text-zinc-600">
            Wysłaliśmy link potwierdzający na <strong className="text-zinc-900">{view.account.pendingEmail}</strong>. Kliknij go — link jest ważny 24
            godziny. Jeśli maila nie ma, sprawdź folder spam.
          </p>
          <button type="button" onClick={() => void refresh()} className={`${ui.btnPrimary} w-full`}>
            Potwierdziłem — przejdź dalej
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setView({ status: "form", account: view.account });
            }}
            className={`${ui.btnGhost} w-full`}
          >
            Wyślij ponownie albo zmień adres
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Podaj adres e-mail"
      subtitle={`Konto ${view.account.login} nie ma jeszcze potwierdzonego adresu`}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-zinc-600">
          Adres jest wymagany, żeby korzystać z panelu. Wyślemy na niego link potwierdzający, a później posłuży do przywracania hasła.
        </p>
        {error && <p className={ui.alertError}>{error}</p>}
        <div>
          <label htmlFor="account-email" className={ui.label}>
            Adres e-mail
          </label>
          <input
            id="account-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            disabled={busy}
            className={ui.input}
          />
        </div>
        <div>
          <label htmlFor="account-password" className={ui.label}>
            Obecne hasło
          </label>
          <input
            id="account-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            disabled={busy}
            className={ui.input}
          />
          <p className={ui.hint}>Potwierdza, że adres zmienia właściciel konta.</p>
        </div>
        <button type="submit" disabled={busy || email.trim() === "" || password === ""} className={`${ui.btnPrimary} w-full`}>
          {busy ? "Wysyłanie…" : "Wyślij link potwierdzający"}
        </button>
      </form>
    </AuthLayout>
  );
}
