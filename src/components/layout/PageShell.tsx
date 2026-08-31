import Breadcrumbs from "@/components/layout/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import SectionRenderer from "@/lib/sections";
import { buildPageSchema } from "@/lib/schema";
import { getBreadcrumbs, type Page } from "@/lib/content";

/** Wspólna powłoka każdej podstrony: dane strukturalne + okruszki + sekcje z JSON-a. */
export default function PageShell({ page, showBreadcrumbs = true }: { page: Page; showBreadcrumbs?: boolean }) {
  return (
    <>
      <JsonLd data={buildPageSchema(page)} />
      {showBreadcrumbs && page.slug !== "/" && <Breadcrumbs items={getBreadcrumbs(page)} />}
      <SectionRenderer page={page} />
    </>
  );
}
