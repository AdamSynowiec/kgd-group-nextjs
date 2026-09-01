"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageList from "@/components/admin/PageList";
import PageEditor from "@/components/admin/PageEditor";
import AdminShell from "@/components/admin/AdminShell";
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
 * (backend/admin.php + BasicAuth, sprawdzane względem tabeli `users`) jest
 * jedynym źródłem prawdy o dostępie — to on zwraca 401, gdy dane logowania
 * są niepoprawne; frontend tylko na to reaguje, nie decyduje o uprawnieniach
 * sam. Brak sesji (401) przekierowuje na osobną stronę /admin/login —
 * logowanie nie jest stanem wewnątrz tego komponentu.
 */

type ViewState =
  | { status: "checking" }
  | { status: "list"; pages: PageSummary[] }
  | { status: "editing"; slug: string; content: Record<string, unknown> }
  | { status: "error"; message: string };

function viewTitle(view: ViewState): string {
  switch (view.status) {
    case "editing":
      return `Edycja — ${view.slug}`;
    case "error":
      return "Błąd";
    case "checking":
      return "Wczytywanie...";
    default:
      return "Strony";
  }
}

export default function AdminPage() {
  const router = useRouter();
  // Odczyt sessionStorage jest synchroniczny — leniwy inicjalizator useState
  // (nie efekt) to właściwe miejsce na to, patrz https://react.dev/learn/you-might-not-need-an-effect.
  const [credentials, setCredentials] = useState<Credentials | null>(() => loadCredentials());
  const [view, setView] = useState<ViewState>({ status: "checking" });

  const goToLogin = useCallback(() => {
    storeCredentials(null);
    setCredentials(null);
    router.replace("/admin/login");
  }, [router]);

  const checkAccessAndLoad = useCallback(
    async (creds: Credentials | null) => {
      setView({ status: "checking" });
      try {
        const pages = await fetchPages(creds);
        setView({ status: "list", pages });
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) {
          goToLogin();
          return;
        }
        setView({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
      }
    },
    [goToLogin]
  );

  // Prawdziwe zapytanie sieciowe do zewnętrznego systemu (backend) przy
  // montowaniu — dokładnie przypadek, do którego useEffect jest przeznaczony
  // (patrz https://react.dev/learn/you-might-not-need-an-effect#fetching-data).
  // Reguła set-state-in-effect widzi przez checkAccessAndLoad, że na starcie
  // ustawiamy status "checking", i traktuje to jak synchroniczny setState —
  // ale to właśnie stan ładowania przed odpowiedzią z sieci, nie kaskada.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrz komentarz wyżej: to jest fetch danych przy montowaniu, nie kaskada stanu
    void checkAccessAndLoad(credentials);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ma się uruchomić tylko raz, przy montowaniu
  }, []);

  async function handleEdit(slug: string) {
    setView({ status: "checking" });
    try {
      const content = await fetchPage(slug, credentials);
      setView({ status: "editing", slug, content });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        goToLogin();
        return;
      }
      setView({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }

  function handleBack() {
    void checkAccessAndLoad(credentials);
  }

  return (
    <AdminShell title={viewTitle(view)} credentials={credentials} onLogout={goToLogin}>
      {view.status === "checking" && <p className="text-sm text-zinc-500">Wczytywanie...</p>}

      {view.status === "list" && <PageList pages={view.pages} onEdit={handleEdit} />}

      {view.status === "editing" && (
        <PageEditor slug={view.slug} initialContent={view.content} credentials={credentials} onBack={handleBack} />
      )}

      {view.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {view.message}
        </div>
      )}
    </AdminShell>
  );
}
