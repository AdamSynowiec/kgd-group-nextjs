/**
 * Pliki serwisu edytowane w panelu (Ustawienia → Pliki serwisu) — mirror rejestru
 * backend/src/Support/SiteFiles.php. Bez własnej treści w bazie build generuje plik domyślny
 * (defaultContent), więc pusty edytor = bezpieczne ustawienie, nie pusty plik.
 *
 * Nowy plik: wpis tutaj i w SiteFiles.php + trasa src/app/<nazwa>/route.ts (wzór: robots.txt).
 * Bez importów z Node — z tego modułu korzysta też panel (podgląd treści domyślnej).
 */
export type SiteFileName = "robots.txt";

export const SITE_FILES: Record<SiteFileName, { description: string; defaultContent: (baseUrl: string) => string }> = {
  "robots.txt": {
    description: "Instrukcje dla robotów wyszukiwarek: które adresy mogą indeksować i gdzie jest mapa strony.",
    defaultContent: (baseUrl) => ["User-agent: *", "Allow: /", "Disallow: /admin", "", `Sitemap: ${baseUrl.replace(/\/+$/, "")}/sitemap.xml`, ""].join("\n"),
  },
};
