/**
 * JEDYNE miejsce, które trzeba dotknąć, żeby dodać NOWĄ kolekcję (np.
 * "Realizacje", "Zespół") — nie nowa tabela, nie nowy kontroler PHP, nie
 * nowy panel admina. Backend (collection_items, patrz
 * db/007_create_collection_items_table.sql) i panel (CollectionList.tsx,
 * CollectionItemEditor.tsx) są całkowicie generyczne względem `collection`;
 * to, co odróżnia jedną kolekcję od drugiej, żyje wyłącznie tutaj.
 */

export type CollectionDefinition = {
  /** Techniczny klucz — trafia do ?collection= i do kolumny `collection`. Kebab-case, jak slug. */
  key: string;
  /** Nazwa w sidebarze/nagłówkach panelu, np. "Blog". */
  label: string;
  /** Nazwa pojedynczego elementu, np. "Wpis" — używana w przyciskach ("Nowy wpis"), potwierdzeniach usuwania. */
  itemLabelSingular: string;
  /** Liczba elementów na stronę publicznej listy (i pod generateStaticParams() paginacji). */
  pageSize: number;
  /**
   * Startowa treść nowego elementu — ta sama konwencja {value,editable,label,type}
   * co wszędzie indziej (patrz src/lib/editable.ts). "title" jest tu
   * jedyną wymaganą, uniwersalną konwencją (tak samo jak w `pages` — patrz
   * MysqlPageRepository::listPublished(), które też zakłada pole "title").
   */
  blankContent: (title: string) => Record<string, unknown>;
};

export const COLLECTIONS: Record<string, CollectionDefinition> = {
  blog: {
    key: "blog",
    label: "Blog",
    itemLabelSingular: "Wpis",
    pageSize: 10,
    blankContent: (title) => ({
      title: { value: title, editable: true, label: "Tytuł", type: "string" },
      excerpt: { value: "", editable: true, label: "Zajawka (widoczna na liście)", type: "string" },
      coverImage: { value: "", editable: true, label: "Zdjęcie główne", type: "asset" },
      author: { value: "", editable: true, label: "Autor", type: "string" },
      body: { value: "", editable: true, label: "Treść artykułu", type: "string" },
      tags: { value: [], editable: true, label: "Tagi", type: "table" },
      seo: {
        title: { value: "", editable: true, label: "Tytuł SEO", type: "string" },
        description: { value: "", editable: true, label: "Opis SEO", type: "string" },
      },
    }),
  },
};

export function getCollectionDefinition(key: string): CollectionDefinition {
  const definition = COLLECTIONS[key];
  if (!definition) {
    throw new Error(`Nieznana kolekcja: "${key}". Dodaj ją w src/lib/collections/registry.ts.`);
  }
  return definition;
}
