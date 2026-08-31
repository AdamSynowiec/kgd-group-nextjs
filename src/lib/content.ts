import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

/**
 * Warstwa dostępu do treści.
 *
 * getSite() nadal czyta src/data/site.json z dysku — backend (backend/) na
 * razie wystawia tylko podstrony ("pages"), nie konfigurację serwisu.
 *
 * getAllPages()/getPageBySlug() natomiast pytają PHP-owe API (backend/),
 * które czyta z MySQL (db/schema.sql) — nie z lokalnych plików JSON.
 * Dzieje się to w czasie builda (SSG): `next build` uruchamia te funkcje
 * po stronie Node.js, wynik trafia do statycznego HTML-a w out/. W wygenerowanej
 * stronie nie ma już ani jednego zapytania do API — przeglądarka go nie widzi.
 */

export type NavLink = { label: string; href: string };

export type SiteConfig = {
  brand: { name: string; tagline?: string };
  nav: { primary: NavLink[] };
  seoDefaults: {
    siteName: string;
    title: string;
    description: string;
    /** Pełny adres domeny, np. "https://kgd-group.pl" — baza dla canonical, OG i JSON-LD. */
    metadataBase: string;
    ogImage?: string;
    ogLocale?: string;
    themeColor?: string;
    twitterSite?: string | null;
    author?: string;
  };
};

export type PageSection = {
  id: string;
  component: string;
  fields?: Record<string, unknown>;
  visible?: boolean;
};

/**
 * Wpis danych strukturalnych (JSON-LD) do wygenerowania dla strony.
 * "from" wskazuje źródło treści: łańcuch rodziców (breadcrumbs) albo
 * konkretna sekcja po id — dzięki temu schema czyta te same dane,
 * które widzi użytkownik, nawet zanim sekcja ma gotowy komponent wizualny.
 */
export type StructuredDataEntry =
  | { type: "BreadcrumbList"; from: "parent" }
  | { type: "WebPage" }
  | { type: "FAQPage"; from: `section:${string}` };

export type PageSeo = {
  title?: string;
  description?: string;
  keywords?: string[];
  /** Nadpisuje wyliczany canonical; zwykle null — wtedy liczony ze slug. */
  canonical?: string | null;
  robots?: { index?: boolean; follow?: boolean };
  author?: string;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  ogType?: "website" | "article";
  ogUrl?: string | null;
  ogSiteName?: string;
  ogLocale?: string;
  twitterCard?: "summary" | "summary_large_image";
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  twitterImage?: string | null;
  language?: string;
  structuredData?: StructuredDataEntry[];
};

export type PageNav = {
  label?: string;
  order?: number;
  summary?: string;
  /** Pola pod kafelki na hubach/stronie głównej (SolutionGrid i podobne). */
  problem?: string;
  answer?: string;
  services?: string[];
};

export type Page = {
  slug: string;
  parent?: string | null;
  template?: string;
  title: string;
  updatedAt?: string;
  status?: "draft" | "published";
  nav?: PageNav;
  seo?: PageSeo;
  sections: PageSection[];
  related?: { mode?: "auto" | "manual"; manual?: string[] };
};

/** Lekki wpis z listy `GET /api/pages` — tyle, ile backend zwraca bez wczytywania pełnej treści. */
export type PageSummary = { slug: string; title: string; updatedAt: string };

const ROOT = process.cwd();
const SITE_FILE = path.join(ROOT, "src", "data", "site.json");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export const getSite = cache((): SiteConfig => readJson<SiteConfig>(SITE_FILE));

export function normalizeSlug(slug: string): string {
  if (!slug || slug === "/") return "/";
  const withSlash = slug.startsWith("/") ? slug : `/${slug}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

export function slugToSegments(slug: string): string[] {
  return normalizeSlug(slug).split("/").filter(Boolean);
}

/**
 * Slug -> ścieżka URL zgodna z next.config.ts (trailingSlash: true), czyli
 * z ukośnikiem na końcu poza "/", które już go ma. next/link i metadata API
 * Next.js robią to automatycznie; ten helper jest dla miejsc, gdzie adres
 * budujemy ręcznie przez new URL() — JSON-LD, sitemap.xml, llms.txt.
 */
export function toUrlPath(slug: string): string {
  const normalized = normalizeSlug(slug);
  return normalized === "/" ? "/" : `${normalized}/`;
}

/** Adres backendu — zmienna środowiskowa albo domena z site.json + "/api". */
function apiBaseUrl(): string {
  const explicit = process.env.API_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  return `${getSite().seoDefaults.metadataBase.replace(/\/+$/, "")}/api`;
}

/**
 * GET do backendu, przez index.php?route=... — nie przez "ładny" URL.
 * Część hostingów współdzielonych (np. gdy serwer stoi na nginx, nie
 * Apache) ignoruje .htaccess/mod_rewrite, więc trasa musi dotrzeć jako
 * zwykły parametr GET, nie jako ścieżka URL-a. Patrz backend/src/Http/Request.php.
 *
 * Zwraca null na 404 (to prawidłowy, oczekiwany wynik — "takiej strony nie
 * ma"), rzuca błąd na każdą inną nieudaną odpowiedź, żeby `next build`
 * wyraźnie się wywalił zamiast po cichu wygenerować pustą stronę.
 */
async function apiGet<T>(route: string): Promise<T | null> {
  const url = `${apiBaseUrl()}/index.php?route=${encodeURIComponent(route)}`;
  const response = await fetch(url);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Backend API zwrócił ${response.status} dla ${route}`);
  }

  const body = (await response.json()) as { data: T };
  return body.data;
}

/** route=/pages — lista opublikowanych stron pod generateStaticParams(). */
export const getAllPages = cache(async (): Promise<PageSummary[]> => {
  const pages = await apiGet<PageSummary[]>("/pages");
  return pages ?? [];
});

/** route=/page[/segment/...] — pełna treść jednej strony po slugu. */
export const getPageBySlug = cache(async (slug: string): Promise<Page | null> => {
  const normalized = normalizeSlug(slug);
  const suffix = normalized === "/" ? "" : normalized;
  return apiGet<Page>(`/page${suffix}`);
});

/** Okruszki wyprowadzane z pola "parent", nie z URL-a. */
export async function getBreadcrumbs(page: Page): Promise<NavLink[]> {
  const crumbs: NavLink[] = [];
  let current: Page | null = page;
  let guard = 0;

  while (current && current.slug !== "/" && guard < 6) {
    crumbs.unshift({ label: current.nav?.label || current.title, href: current.slug });
    current = current.parent ? await getPageBySlug(current.parent) : null;
    guard += 1;
  }

  crumbs.unshift({ label: "Start", href: "/" });
  return crumbs;
}
