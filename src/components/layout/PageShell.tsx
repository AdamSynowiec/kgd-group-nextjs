import Breadcrumbs from "@/components/layout/Breadcrumbs";
import SectionRenderer from "@/lib/sections";
import { getBreadcrumbs, type Page } from "@/lib/content";

/** Wspólna powłoka każdej podstrony: okruszki + sekcje z JSON-a. */
export default function PageShell({ page, showBreadcrumbs = true }: { page: Page; showBreadcrumbs?: boolean }) {
  return (
    <>
      {showBreadcrumbs && page.slug !== "/" && <Breadcrumbs items={getBreadcrumbs(page)} />}
      <SectionRenderer page={page} />
    </>
  );
}
