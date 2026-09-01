"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { AdminApiError, fetchPages, storeCredentials } from "@/lib/adminApi";

/**
 * Osobna strona logowania (nie stan wewnątrz /admin) — dokładnie jak
 * wp-login.php w WordPressie: wchodzisz tu, dopiero po sukcesie trafiasz
 * do dashboardu. Weryfikacja loginu/hasła dzieje się na backendzie
 * (fetchPages() z podanymi danymi) — ta strona nigdy sama nie decyduje,
 * czy dane są poprawne, tylko odczytuje odpowiedź API.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  async function handleSubmit(username: string, password: string) {
    setErrorMessage(undefined);
    const credentials = { username, password };

    try {
      await fetchPages(credentials);
      storeCredentials(credentials);
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
    <main className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <LoginForm onSubmit={handleSubmit} errorMessage={errorMessage} />
    </main>
  );
}
