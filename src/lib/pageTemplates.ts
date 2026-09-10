/**
 * Startowa treść NOWEJ strony w `pages`, wg wybranego szablonu — zastępuje
 * rolę, którą wcześniej pełnił src/lib/collections/registry.ts dla bloga
 * (jedynej dotąd "kolekcji"). Blog nie jest już osobnym mechanizmem — to
 * zwykła strona z sekcją "BlogPost" (patrz src/components/blog/BlogPost.tsx),
 * więc jej szablon żyje tu, obok każdego innego.
 *
 * "title"/"seo"/"sections" w zwracanej treści to ta sama konwencja
 * {value,editable,label,type} co wszędzie indziej (patrz src/lib/editable.ts).
 */

export type PageTemplate = {
  key: string;
  label: string;
  /** Domyślny pełny adres wyliczany z tytułu — redaktor może go nadpisać przed utworzeniem. */
  defaultSlug: (titleSlug: string) => string;
  blankContent: (title: string, slug: string) => Record<string, unknown>;
};

export const PAGE_TEMPLATES: Record<string, PageTemplate> = {
  blank: {
    key: "blank",
    label: "Pusta strona",
    defaultSlug: (titleSlug) => `/${titleSlug}`,
    blankContent: (title, slug) => ({
      slug,
      parent: "/",
      template: "blank",
      title: { value: title, editable: true, label: "Tytuł", type: "string" },
      status: "draft",
      seo: {
        title: { value: "", editable: true, label: "Tytuł SEO", type: "string" },
        description: { value: "", editable: true, label: "Opis SEO", type: "string" },
      },
      sections: [],
    }),
  },
  "blog-post": {
    key: "blog-post",
    label: "Wpis bloga",
    defaultSlug: (titleSlug) => `/blog/${titleSlug}`,
    blankContent: (title, slug) => ({
      slug,
      parent: "/blog",
      template: "blog-post",
      title: { value: title, editable: true, label: "Tytuł", type: "string" },
      status: "draft",
      seo: {
        title: { value: "", editable: true, label: "Tytuł SEO", type: "string" },
        description: { value: "", editable: true, label: "Opis SEO", type: "string" },
      },
      sections: [
        {
          id: "post",
          component: "BlogPost",
          fields: {
            excerpt: { value: "", editable: true, label: "Zajawka (widoczna na liście)", type: "string" },
            coverImage: { value: "", editable: true, label: "Zdjęcie główne", type: "asset" },
            author: { value: "", editable: true, label: "Autor", type: "string" },
            body: { value: "", editable: true, label: "Treść artykułu", type: "richtext" },
            tags: { value: [], editable: true, label: "Tagi", type: "table" },
          },
        },
      ],
    }),
  },
};

export function getPageTemplate(key: string): PageTemplate {
  const template = PAGE_TEMPLATES[key];
  if (!template) {
    throw new Error(`Nieznany szablon strony: "${key}". Dodaj go w src/lib/pageTemplates.ts.`);
  }
  return template;
}
