"use client";

import type { PageSummary } from "@/lib/adminApi";

export default function PageList({ pages, onEdit }: { pages: PageSummary[]; onEdit: (slug: string) => void }) {
  if (pages.length === 0) {
    return <p className="text-sm text-zinc-500">Brak stron.</p>;
  }

  return (
    <ul className="space-y-2">
      {pages.map((page) => (
        <li
          key={page.slug}
          className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div>
            <div className="font-medium">
              {page.title}
              {page.status === "draft" && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  szkic
                </span>
              )}
            </div>
            <div className="text-sm text-zinc-500">
              {page.slug} · ostatnia zmiana: {page.updatedAt}
            </div>
          </div>
          <button
            onClick={() => onEdit(page.slug)}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Edytuj
          </button>
        </li>
      ))}
    </ul>
  );
}
