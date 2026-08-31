import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import PageShell from "@/components/layout/PageShell";

export function generateMetadata(): Metadata {
  const page = getPageBySlug("/");
  return page?.seo ? { title: page.seo.title, description: page.seo.description } : {};
}

export default function HomePage() {
  const page = getPageBySlug("/");
  if (!page) notFound();

  return <PageShell page={page} showBreadcrumbs={false} />;
}
