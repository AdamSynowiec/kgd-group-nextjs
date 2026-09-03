"use client";

import type { PageSummary } from "@/lib/adminApi";

export default function PageList({ pages, onEdit }: { pages: PageSummary[]; onEdit: (slug: string) => void }) {
  if (pages.length === 0) {
    return <p className="text-sm text-zinc-500">Brak stron.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <ul className="divide-y divide-zinc-100">
        {pages.map((page) => (
          <li key={page.slug} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-zinc-900">{page.title}</span>
                {page.status === "draft" && (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    szkic
                  </span>
                )}
              </div>
              <div className="truncate text-sm text-zinc-500">
                {page.slug} · ostatnia zmiana: {page.updatedAt}
              </div>
            </div>
            <button
              onClick={() => onEdit(page.slug)}
              className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50"
            >
              Edytuj
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
