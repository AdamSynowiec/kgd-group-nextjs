import Breadcrumbs from "@/components/layout/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import SectionRenderer from "@/lib/sections";
import { buildPageSchema } from "@/lib/schema";
import { getBreadcrumbs, type Page } from "@/lib/content";

/** Wspólna powłoka każdej podstrony: dane strukturalne + okruszki + sekcje z JSON-a. */
export default async function PageShell({ page, showBreadcrumbs = true }: { page: Page; showBreadcrumbs?: boolean }) {
  const showCrumbs = showBreadcrumbs && page.slug !== "/";

  const [schema, crumbs] = await Promise.all([
    buildPageSchema(page),
    showCrumbs ? getBreadcrumbs(page) : Promise.resolve(null),
  ]);

  return (
    <>
      <JsonLd data={schema} />
      {crumbs && <Breadcrumbs items={crumbs} />}
      <SectionRenderer page={page} />
    </>
  );
}
