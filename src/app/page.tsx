import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import PageShell from "@/components/layout/PageShell";

export function generateMetadata(): Metadata {
  const page = getPageBySlug("/");
  return page ? buildMetadata(page) : {};
}

export default function HomePage() {
  const page = getPageBySlug("/");
  if (!page) notFound();

  return <PageShell page={page} showBreadcrumbs={false} />;
}
