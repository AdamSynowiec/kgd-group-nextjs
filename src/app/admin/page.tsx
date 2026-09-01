"use client";

import { useCallback, useEffect, useState } from "react";
import LoginForm from "@/components/admin/LoginForm";
import PageList from "@/components/admin/PageList";
import PageEditor from "@/components/admin/PageEditor";
import BuildButton from "@/components/admin/BuildButton";
import {
  AdminApiError,
  fetchPage,
  fetchPages,
  loadCredentials,
  storeCredentials,
  type Credentials,
  type PageSummary,
} from "@/lib/adminApi";

/**
 * /admin — pełnoprawny widok aplikacji (nie statyczny plik HTML w backendzie).
 * Cała logika działa w przeglądarce: strona po zbudowaniu to pusta powłoka,
 * dane i autoryzacja przychodzą z API dopiero po wejściu. Backend
 * (backend/admin.php + BasicAuth) jest jedynym źródłem prawdy o dostępie —
 * to on zwraca 401, gdy uwierzytelnianie jest włączone i dane się nie zgadzają;
 * frontend tylko na to reaguje, nie decyduje o uprawnieniach sam.
 */

type ViewState =
  | { status: "checking" }
  | { status: "login"; message?: string }
  | { status: "list"; pages: PageSummary[] }
  | { status: "editing"; slug: string; content: Record<string, unknown> }
  | { status: "error"; message: string };

export default function AdminPage() {
  // Odczyt sessionStorage jest synchroniczny — leniwy inicjalizator useState
  // (nie efekt) to właściwe miejsce na to, patrz https://react.dev/learn/you-might-not-need-an-effect.
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadCredentials());
  const [view, setView] = useState<ViewState>({ status: "checking" });

  const checkAccessAndLoad = useCallback(async (creds: Credentials | null) => {
    setView({ status: "checking" });
    try {
      const pages = await fetchPages(creds);
      setView({ status: "list", pages });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setView({ status: "login" });
        return;
      }
      setView({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }, []);

  // Prawdziwe zapytanie sieciowe do zewnętrznego systemu (backend) przy
  // montowaniu — dokładnie przypadek, do którego useEffect jest przeznaczony
  // (patrz https://react.dev/learn/you-might-not-need-an-effect#fetching-data).
  // Reguła set-state-in-effect widzi przez checkAccessAndLoad, że na starcie
  // ustawiamy status "checking", i traktuje to jak synchroniczny setState —
  // ale to właśnie stan ładowania przed odpowiedzią z sieci, nie kaskada.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrz komentarz wyżej: to jest fetch danych przy montowaniu, nie kaskada stanu
    void checkAccessAndLoad(credentials);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ma się uruchomić tylko raz, przy montowaniu; ponowne logowanie woła checkAccessAndLoad bezpośrednio
  }, []);

  function handleLogin(username: string, password: string) {
    const creds = { username, password };
    storeCredentials(creds);
    setCredentials(creds);
    void checkAccessAndLoad(creds);
  }

  function handleLogout() {
    storeCredentials(null);
    setCredentials(null);
    setView({ status: "login" });
  }

  async function handleEdit(slug: string) {
    setView({ status: "checking" });
    try {
      const content = await fetchPage(slug, credentials);
      setView({ status: "editing", slug, content });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        setView({ status: "login", message: "Sesja wygasła — zaloguj się ponownie." });
        return;
      }
      setView({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }

  function handleBack() {
    void checkAccessAndLoad(credentials);
  }

  return (
    <div className="mx-auto min-h-full max-w-3xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Panel KGD Group</h1>
        <div className="flex items-center gap-4">
          <BuildButton credentials={credentials} />
          {credentials && (
            <button onClick={handleLogout} className="text-sm text-zinc-500 hover:underline">
              Wyloguj
            </button>
          )}
        </div>
      </header>

      {view.status === "checking" && <p className="text-sm text-zinc-500">Wczytywanie...</p>}

      {view.status === "login" && <LoginForm onSubmit={handleLogin} errorMessage={view.message} />}

      {view.status === "list" && <PageList pages={view.pages} onEdit={handleEdit} />}

      {view.status === "editing" && (
        <PageEditor slug={view.slug} initialContent={view.content} credentials={credentials} onBack={handleBack} />
      )}

      {view.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {view.message}
        </div>
      )}
    </div>
  );
}
