import fs from "node:fs";
import path from "node:path";
import { cache } from "react";

/**
 * Warstwa dostępu do treści.
 * Wszystko czytane jest z src/data w czasie builda (SSG) — zero requestów w runtime.
 * Dodanie podstrony = dodanie pliku JSON w src/data/pages. Nic więcej.
 */

export type NavLink = { label: string; href: string };

export type SiteConfig = {
  brand: { name: string; tagline?: string };
  nav: { primary: NavLink[] };
  seoDefaults: { siteName: string; title: string; description: string };
};

export type PageSection = {
  id: string;
  component: string;
  fields?: Record<string, unknown>;
  visible?: boolean;
};

export type Page = {
  slug: string;
  parent?: string | null;
  title: string;
  status?: "draft" | "published";
  nav?: { label?: string; order?: number; summary?: string };
  seo?: { title?: string; description?: string };
  sections: PageSection[];
};

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, "src", "data", "pages");
const SITE_FILE = path.join(ROOT, "src", "data", "site.json");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".json") ? [full] : [];
  });
}

export const getSite = cache((): SiteConfig => readJson<SiteConfig>(SITE_FILE));

export const getAllPages = cache((): Page[] =>
  walk(PAGES_DIR)
    .map((file) => readJson<Page>(file))
    .filter((page) => page.status !== "draft")
    .sort((a, b) => (a.nav?.order ?? 99) - (b.nav?.order ?? 99))
);

export function normalizeSlug(slug: string): string {
  if (!slug || slug === "/") return "/";
  const withSlash = slug.startsWith("/") ? slug : `/${slug}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
}

export function slugToSegments(slug: string): string[] {
  return normalizeSlug(slug).split("/").filter(Boolean);
}

export const getPageBySlug = cache((slug: string): Page | null => {
  const normalized = normalizeSlug(slug);
  return getAllPages().find((page) => page.slug === normalized) ?? null;
});

/** Okruszki wyprowadzane z pola "parent", nie z URL-a. */
export function getBreadcrumbs(page: Page): NavLink[] {
  const crumbs: NavLink[] = [];
  let current: Page | null = page;
  let guard = 0;

  while (current && current.slug !== "/" && guard < 6) {
    crumbs.unshift({ label: current.nav?.label || current.title, href: current.slug });
    current = current.parent ? getPageBySlug(current.parent) : null;
    guard += 1;
  }

  crumbs.unshift({ label: "Start", href: "/" });
  return crumbs;
}
