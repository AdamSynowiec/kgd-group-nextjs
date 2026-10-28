import { getSite, getSiteFile } from "@/lib/content";
import { SITE_FILES } from "@/lib/siteFiles";

export const dynamic = "force-static";

/**
 * robots.txt — treść z panelu (Ustawienia → Pliki serwisu), a bez niej domyślna
 * z src/lib/siteFiles.ts. Zmiana w panelu trafia tu przy najbliższej publikacji.
 */
export async function GET() {
  const base = getSite().seoDefaults.metadataBase;
  const content = (await getSiteFile("robots.txt")) ?? SITE_FILES["robots.txt"].defaultContent(base);

  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
