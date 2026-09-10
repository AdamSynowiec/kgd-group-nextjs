"use client";

import ContentEditor from "@/components/admin/ContentEditor";
import { savePage, type Session } from "@/lib/adminApi";

/** Cienki wrapper ContentEditor dla stron w `pages` (w tym wpisów bloga — zwykłe strony z parent:"/blog", patrz src/lib/pageTemplates.ts). */
export default function PageEditor({
  slug,
  initialContent,
  session,
  onBack,
}: {
  slug: string;
  initialContent: Record<string, unknown>;
  session: Session | null;
  onBack: () => void;
}) {
  return (
    <ContentEditor
      backLabel="Wszystkie strony"
      titleLabel={slug}
      initialContent={initialContent}
      session={session}
      onBack={onBack}
      onSave={(content) => savePage(slug, content, session)}
    />
  );
}
