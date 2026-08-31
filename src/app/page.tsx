import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import PageShell from "@/components/layout/PageShell";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("/");
  return page ? buildMetadata(page) : {};
}

export default async function HomePage() {
  const page = await getPageBySlug("/");
  if (!page) notFound();

  return <PageShell page={page} showBreadcrumbs={false} />;
}
