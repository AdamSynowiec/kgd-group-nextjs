"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import CollectionList from "@/components/admin/CollectionList";
import CollectionItemEditor from "@/components/admin/CollectionItemEditor";
import { getCollectionDefinition } from "@/lib/collections/registry";
import {
  AdminApiError,
  fetchCollectionItem,
  fetchCollectionItems,
  loadSession,
  storeSession,
  type CollectionItem,
  type CollectionItemSummary,
  type Session,
} from "@/lib/adminApi";

/**
 * /admin/blog — mirror src/app/admin/page.tsx (lista <-> edycja), tylko dla
 * jednej kolekcji zamiast dla `pages`. Gdy powstanie druga kolekcja, ta
 * strona jest szablonem do skopiowania (albo do sparametryzowania przez
 * [collection] — na razie jedna kolekcja nie uzasadnia dynamicznej trasy).
 */

const COLLECTION = getCollectionDefinition("blog");

type ViewState =
  | { status: "checking" }
  | { status: "list"; items: CollectionItemSummary[] }
  | { status: "editing"; item: CollectionItem }
  | { status: "error"; message: string };

export default function AdminBlogPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<ViewState>({ status: "checking" });

  const goToLogin = useCallback(() => {
    storeSession(null);
    setSession(null);
    router.replace("/admin/login");
  }, [router]);

  const load = useCallback(
    async (currentSession: Session | null) => {
      setView({ status: "checking" });
      try {
        const items = await fetchCollectionItems(COLLECTION.key, currentSession);
        setView({ status: "list", items });
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch danych przy montowaniu, patrz src/app/admin/page.tsx
    void load(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ma się uruchomić tylko raz, przy montowaniu
  }, []);

  async function handleEdit(slug: string) {
    setView({ status: "checking" });
    try {
      const item = await fetchCollectionItem(COLLECTION.key, slug, session);
      setView({ status: "editing", item });
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        goToLogin();
        return;
      }
      setView({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }

  function handleBack() {
    void load(session);
  }

  return (
    <AdminShell title={COLLECTION.label} session={session} onLogout={goToLogin}>
      {view.status === "checking" && <p className="text-sm text-zinc-500">Wczytywanie...</p>}

      {view.status === "list" && (
        <CollectionList collection={COLLECTION} initialItems={view.items} session={session} onEdit={handleEdit} />
      )}

      {view.status === "editing" && (
        <CollectionItemEditor collection={COLLECTION} item={view.item} session={session} onBack={handleBack} />
      )}

      {view.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{view.message}</div>
      )}
    </AdminShell>
  );
}
