"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { AdminApiError, login, storeSession } from "@/lib/adminApi";

/**
 * Osobna strona logowania (nie stan wewnątrz /admin) — dokładnie jak
 * wp-login.php w WordPressie: wchodzisz tu, dopiero po sukcesie trafiasz
 * do dashboardu. Weryfikacja loginu/hasła dzieje się na backendzie
 * (POST /login) — ta strona nigdy sama nie decyduje, czy dane są poprawne,
 * tylko odczytuje odpowiedź API i zapisuje wystawiony token sesji.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function handleSubmit(loginName: string, password: string) {
    setErrorMessage(undefined);

    try {
      const session = await login(loginName, password);
      storeSession(session);
      router.push("/admin");
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setErrorMessage("Nieprawidłowy login lub hasło.");
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    }
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-zinc-50 px-6 py-12 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(24,24,27,0.07)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="relative w-full max-w-[400px]">
        <LoginForm onSubmit={handleSubmit} errorMessage={errorMessage} />
      </div>
    </main>
  );
}
