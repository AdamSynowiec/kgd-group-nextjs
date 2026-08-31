import { getAllPages, getSite } from "@/lib/content";

export const dynamic = "force-static";

/**
 * llms.txt (https://llmstxt.org) — zwięzły, czysto tekstowy spis treści
 * serwisu dla modeli/agentów AI, obok robots.txt (dla crawlerów) i
 * sitemap.xml (dla wyszukiwarek). Lista stron pochodzi z getAllPages(),
 * więc jest zawsze zgodna z tym, co faktycznie istnieje w bazie.
 */
export async function GET() {
  const { brand, seoDefaults } = getSite();
  const base = seoDefaults.metadataBase.replace(/\/+$/, "");
  const pages = await getAllPages();

  const lines = [
    `# ${brand.name}`,
    "",
    `> ${seoDefaults.description}`,
    "",
    "## Strony",
    "",
    ...pages.map((page) => `- [${page.title}](${base}${page.slug === "/" ? "" : page.slug})`),
  ];

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
