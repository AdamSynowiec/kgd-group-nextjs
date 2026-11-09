"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  approveChanges,
  fetchChanges,
  revertChanges,
  triggerBuild,
  type ReviewField,
  type ReviewHistoryEntry,
  type ReviewOverview,
  type ReviewPage,
  type Session,
} from "@/lib/adminApi";
import { can } from "@/lib/permissions";
import { CheckIcon, ExternalIcon, RocketIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";

/**
 * "Zmiany do akceptacji" (admin, uprawnienie changes.review): prośby edytorów o weryfikację,
 * niezatwierdzone zmiany pole po polu (wersja na stronie -> po zmianie, jak diff w gicie)
 * z decyzją zatwierdź / cofnij dla pola, strony albo wszystkiego, oraz historia decyzji.
 * Backend: ReviewController.php / PageReview.php.
 */
export default function ChangesPanel({ session }: { session: Session | null }) {
  const [data, setData] = useState<ReviewOverview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const canBuild = can(session?.permissions, "build.trigger");

  const load = useCallback(async () => {
    try {
      setData(await fetchChanges(session));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać zmian.");
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch danych przy montowaniu, patrz src/app/admin/page.tsx
    void load();
  }, [load]);

  async function run(id: string, action: () => Promise<string>) {
    setBusy(id);
    setNotice(null);
    try {
      setNotice({ tone: "ok", text: await action() });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Operacja nie powiodła się." });
    } finally {
      setBusy(null);
    }
  }

  const approveField = (page: ReviewPage, field: ReviewField) =>
    run(`a:${page.slug}:${field.key}`, async () => {
      await approveChanges(session, { slug: page.slug, key: field.key });
      return `Zatwierdzono: ${field.label}.`;
    });
  const revertField = (page: ReviewPage, field: ReviewField) => {
    if (!window.confirm(`Cofnąć zmianę „${field.label}” na stronie ${page.slug}? Pole wróci do wartości sprzed zmiany.`)) return;
    void run(`r:${page.slug}:${field.key}`, async () => {
      await revertChanges(session, { slug: page.slug, key: field.key });
      return `Cofnięto: ${field.label}.`;
    });
  };
  const approvePage = (page: ReviewPage) =>
    run(`a:${page.slug}`, async () => {
      await approveChanges(session, { slug: page.slug });
      return `Zatwierdzono zmiany strony „${page.title}”.`;
    });
  const revertPage = (page: ReviewPage) => {
    const question = page.isNew
      ? `Odrzucić nową stronę „${page.title}” (${page.slug})? Strona zostanie usunięta.`
      : `Cofnąć wszystkie zmiany strony „${page.title}” (${page.fields.length})? Pola wrócą do wartości sprzed zmian.`;
    if (!window.confirm(question)) return;
    void run(`r:${page.slug}`, async () => {
      await revertChanges(session, { slug: page.slug });
      return page.isNew ? `Odrzucono nową stronę ${page.slug}.` : `Cofnięto zmiany strony „${page.title}”.`;
    });
  };
  const approveAll = (build: boolean) => {
    if (build && !window.confirm("Zatwierdzić wszystkie zmiany i zbudować stronę? Zmiany trafią na stronę po zakończeniu budowania.")) return;
    void run(build ? "all+build" : "all", async () => {
      const result = await approveChanges(session);
      if (!build) return `Zatwierdzono zmiany: ${result.approved}.`;
      await triggerBuild(session, "quick");
      return `Zatwierdzono zmiany (${result.approved}) i uruchomiono budowanie strony — postęp przy przycisku „Zbuduj” u góry.`;
    });
  };

  const pages = data?.pages ?? [];
  const totalFields = pages.reduce((sum, page) => sum + (page.isNew ? 1 : page.fields.length), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Zmiany do akceptacji</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Zmiany edytorów nie trafiają na stronę, dopóki ich nie zatwierdzisz — także zwykły przycisk „Zbuduj” buduje wersję zatwierdzoną. Cofnięcie przywraca pole do wartości sprzed
            zmiany.
          </p>
        </div>
        {pages.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={() => approveAll(false)} disabled={busy !== null} className={ui.btnSecondary}>
              <CheckIcon className="h-4 w-4" />
              Zatwierdź wszystko ({totalFields})
            </button>
            {canBuild && (
              <button onClick={() => approveAll(true)} disabled={busy !== null} className={ui.btnPrimary}>
                <RocketIcon className="h-4 w-4" />
                {busy === "all+build" ? "Zatwierdzanie…" : "Zatwierdź i zbuduj"}
              </button>
            )}
          </div>
        )}
      </div>

      {notice && <p className={notice.tone === "ok" ? ui.alertSuccess : ui.alertError}>{notice.text}</p>}
      {error && <p className={ui.alertError}>{error}</p>}
      {!data && !error && <div className="h-40 animate-pulse rounded-xl bg-zinc-200/60" />}

      {data && data.requests.length > 0 && (
        <div className="space-y-2">
          {data.requests.map((request) => (
            <div key={request.id} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
              <div className="min-w-0">
                <div>
                  <b className="font-semibold">{request.login}</b> prosi o weryfikację i akceptację zmian <span className="text-xs text-amber-700">· {formatDateTime(request.createdAt)}</span>
                </div>
                {request.message && <p className="mt-1 whitespace-pre-line text-amber-800">„{request.message}”</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="inline-flex rounded-lg bg-zinc-100 p-1 ring-1 ring-inset ring-zinc-200/60" role="tablist">
          {(
            [
              ["pending", `Do akceptacji (${totalFields})`],
              ["history", "Historia zmian"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${tab === key ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-zinc-200/80" : "text-zinc-500 hover:text-zinc-900"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {data && tab === "pending" && pages.length === 0 && (
        <div className={`${ui.card} flex flex-col items-center px-6 py-14 text-center`}>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-zinc-900">Brak zmian do akceptacji</p>
          <p className="mt-1 text-sm text-zinc-500">Strona jest zgodna z wersją zatwierdzoną.</p>
        </div>
      )}

      {data &&
        tab === "pending" &&
        pages.map((page) => (
          <section key={page.slug} className={`${ui.card} overflow-hidden`}>
            <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50/60 px-5 py-3.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-zinc-900">{page.title}</span>
                  {page.isNew ? (
                    <span className={`${ui.badge} ${ui.badgeSuccess} shrink-0`}>Nowa strona</span>
                  ) : (
                    <span className={`${ui.badge} ${ui.badgeWarning} shrink-0`}>zmienione pola: {page.fields.length}</span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-zinc-500">
                  <span className="font-mono text-[11px]">{page.slug}</span>
                  {page.authors.length > 0 && <> · autor: {page.authors.join(", ")}</>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Link href={`/admin/strony?slug=${encodeURIComponent(page.slug)}`} className={ui.btnSecondarySm} title="Otwórz w edytorze">
                  <ExternalIcon className="h-3.5 w-3.5" />
                  Edytor
                </Link>
                <button onClick={() => revertPage(page)} disabled={busy !== null} className={`${ui.btnSecondarySm} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}>
                  {page.isNew ? "Odrzuć stronę" : "Cofnij wszystko"}
                </button>
                <button onClick={() => approvePage(page)} disabled={busy !== null} className={`${ui.btnSecondarySm} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
                  <CheckIcon className="h-3.5 w-3.5" />
                  Zatwierdź stronę
                </button>
              </div>
            </div>

            {page.isNew && <p className="px-5 py-4 text-sm text-zinc-600">Strona utworzona przez edytora — po zatwierdzeniu pojawi się na stronie przy najbliższym budowaniu.</p>}

            <ul className="divide-y divide-zinc-100">
              {page.fields.map((field) => (
                <li key={field.key} className="px-5 py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-900">{field.label}</div>
                      <div className="text-xs text-zinc-500">
                        {field.authors.length > 0 ? field.authors.join(", ") : "zmiana spoza panelu"}
                        {field.changedAt && ` · ${formatDateTime(field.changedAt)}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {field.revertable && (
                        <button onClick={() => revertField(page, field)} disabled={busy !== null} className={`${ui.btnSecondarySm} hover:border-red-200 hover:bg-red-50 hover:text-red-700`}>
                          Cofnij
                        </button>
                      )}
                      <button onClick={() => void approveField(page, field)} disabled={busy !== null} className={`${ui.btnSecondarySm} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
                        <CheckIcon className="h-3.5 w-3.5" />
                        Zatwierdź
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ValueDiff before={field.old} after={field.new} isStatus={field.key === '["status"]'} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {data && tab === "history" && <History entries={data.history} />}
    </div>
  );
}

// ----- diff -----

const STATUS_LABELS: Record<string, string> = { published: "Opublikowana", draft: "Szkic" };

/** Różnica wartości pola: tekst — słowo po słowie, tabela — zmienione wiersze i komórki, reszta — przed / po. */
function ValueDiff({ before, after, isStatus }: { before: unknown; after: unknown; isStatus?: boolean }) {
  if (isStatus) {
    return <OldNew before={STATUS_LABELS[String(before)] ?? String(before)} after={STATUS_LABELS[String(after)] ?? String(after)} />;
  }
  if ((typeof before === "string" || before == null) && typeof after === "string") {
    return <TextDiff before={toText(before)} after={toText(after)} />;
  }
  if (Array.isArray(after) || Array.isArray(before)) {
    return <TableDiff before={Array.isArray(before) ? before : []} after={Array.isArray(after) ? after : []} />;
  }
  return <OldNew before={formatValue(before)} after={formatValue(after)} />;
}

function OldNew({ before, after }: { before: ReactNode; after: ReactNode }) {
  return (
    <div className="grid gap-1.5 text-[13px] sm:grid-cols-2">
      <div className="rounded-md bg-red-50 px-3 py-2 text-red-900 ring-1 ring-inset ring-red-200/70">
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600/80">było</div>
        <div className="whitespace-pre-wrap break-words">{before === "" ? <i className="text-red-400">puste</i> : before}</div>
      </div>
      <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-900 ring-1 ring-inset ring-emerald-200/70">
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700/80">jest</div>
        <div className="whitespace-pre-wrap break-words">{after === "" ? <i className="text-emerald-500">puste</i> : after}</div>
      </div>
    </div>
  );
}

/** HTML (pola richtext) -> czytelny tekst do porównania. */
function toText(value: string | null | undefined): string {
  const text = value ?? "";
  if (!/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/<\s*(br|\/p|\/h[1-6]|\/li|\/div)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Diff słowo po słowie (LCS); przy bardzo długich tekstach — sam blok przed / po. */
function TextDiff({ before, after }: { before: string; after: string }) {
  const a = before.split(/(\s+)/);
  const b = after.split(/(\s+)/);
  if (before === "" || after === "" || a.length * b.length > 250_000) {
    return <OldNew before={before} after={after} />;
  }
  const ops = diffTokens(a, b);
  return (
    <div className="rounded-md bg-zinc-50 px-3 py-2 text-[13px] leading-relaxed text-zinc-800 ring-1 ring-inset ring-zinc-200/70">
      <div className="whitespace-pre-wrap break-words">
        {ops.map((op, index) =>
          op.type === "same" ? (
            <span key={index}>{op.text}</span>
          ) : op.type === "removed" ? (
            <del key={index} className="rounded-sm bg-red-100 text-red-800 decoration-red-400">
              {op.text}
            </del>
          ) : (
            <ins key={index} className="rounded-sm bg-emerald-100 text-emerald-900 no-underline">
              {op.text}
            </ins>
          )
        )}
      </div>
    </div>
  );
}

type DiffOp = { type: "same" | "removed" | "added"; text: string };

function diffTokens(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  const push = (type: DiffOp["type"], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += text;
    else ops.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("same", a[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push("removed", a[i++]);
    } else {
      push("added", b[j++]);
    }
  }
  while (i < n) push("removed", a[i++]);
  while (j < m) push("added", b[j++]);
  return ops;
}

/** Tabele (lokale, rejestr cen, listy): wiersze dodane / usunięte i zmienione komórki. */
function TableDiff({ before, after }: { before: unknown[]; after: unknown[] }) {
  const rows: ReactNode[] = [];
  const length = Math.max(before.length, after.length);
  for (let index = 0; index < length; index++) {
    const oldRow = before[index];
    const newRow = after[index];
    const name = rowName(newRow ?? oldRow, index);
    if (index >= before.length) {
      rows.push(
        <li key={index} className="text-emerald-800">
          <b className="font-medium">+ {name}</b> <span className="text-emerald-700/80">(nowy wiersz)</span> {rowSummary(newRow)}
        </li>
      );
    } else if (index >= after.length) {
      rows.push(
        <li key={index} className="text-red-800">
          <b className="font-medium">− {name}</b> <span className="text-red-700/80">(usunięty wiersz)</span>
        </li>
      );
    } else if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) {
      const cells = changedCells(oldRow, newRow);
      rows.push(
        <li key={index}>
          <b className="font-medium text-zinc-900">{name}</b>
          <ul className="mt-1 space-y-1 pl-3">
            {cells.map(([cell, from, to]) => (
              <li key={cell} className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-zinc-500">{cell}:</span>
                <del className="rounded-sm bg-red-100 px-1 text-red-800">{from === "" ? "puste" : from}</del>
                <span className="text-zinc-400">→</span>
                <ins className="rounded-sm bg-emerald-100 px-1 text-emerald-900 no-underline">{to === "" ? "puste" : to}</ins>
              </li>
            ))}
          </ul>
        </li>
      );
    }
  }
  if (rows.length === 0) return <p className="text-xs text-zinc-500">Zmieniona kolejność lub format — bez różnic w treści wierszy.</p>;
  return <ul className="space-y-2 rounded-md bg-zinc-50 px-3 py-2 text-[13px] ring-1 ring-inset ring-zinc-200/70">{rows}</ul>;
}

function rowName(row: unknown, index: number): string {
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const record = row as Record<string, unknown>;
    for (const key of ["unit", "name", "label", "title", "item", "nr", "number"]) {
      if (typeof record[key] === "string" && (record[key] as string).trim() !== "") return `Wiersz ${index + 1} (${(record[key] as string).trim()})`;
    }
  }
  return `Wiersz ${index + 1}`;
}

function rowSummary(row: unknown): string {
  if (row && typeof row === "object" && !Array.isArray(row)) {
    return Object.entries(row as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string" || typeof value === "number")
      .slice(0, 4)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" · ");
  }
  return formatValue(row);
}

function changedCells(oldRow: unknown, newRow: unknown): [string, string, string][] {
  if (!oldRow || !newRow || typeof oldRow !== "object" || typeof newRow !== "object" || Array.isArray(oldRow) || Array.isArray(newRow)) {
    return [["wartość", formatValue(oldRow), formatValue(newRow)]];
  }
  const a = oldRow as Record<string, unknown>;
  const b = newRow as Record<string, unknown>;
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .map((key) => [key, formatValue(a[key]), formatValue(b[key])]);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return toText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const json = JSON.stringify(value);
  return json.length > 300 ? `${json.slice(0, 300)}…` : json;
}

// ----- historia -----

function History({ entries }: { entries: ReviewHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className={`${ui.card} px-6 py-10 text-center text-sm text-zinc-500`}>Historia jest pusta.</p>;
  }
  return (
    <div className={`${ui.card} overflow-hidden`}>
      <ul className="divide-y divide-zinc-100">
        {entries.map((entry) => (
          <li key={entry.id} className="px-5 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className={`${ui.badge} shrink-0 ${entry.status === "approved" ? ui.badgeSuccess : "bg-red-50 text-red-700 ring-red-600/15"}`}>
                {entry.status === "approved" ? "zatwierdzona" : "cofnięta"}
              </span>
              <span className="font-medium text-zinc-900">{entry.label}</span>
              <span className="font-mono text-[11px] text-zinc-500">{entry.slug}</span>
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              zmiana: {entry.login ?? "—"} · {formatDateTime(entry.createdAt)}
              {entry.resolvedBy && entry.resolvedBy !== entry.login && ` · decyzja: ${entry.resolvedBy}`}
              {entry.resolvedAt && ` · ${formatDateTime(entry.resolvedAt)}`}
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
              <del className="max-w-full truncate rounded-sm bg-red-50 px-1 text-red-800">{shortValue(entry.old)}</del>
              <span className="text-zinc-400">→</span>
              <ins className="max-w-full truncate rounded-sm bg-emerald-50 px-1 text-emerald-900 no-underline">{shortValue(entry.new)}</ins>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortValue(value: unknown): string {
  if (Array.isArray(value)) return `tabela (${value.length} wierszy)`;
  const text = formatValue(value);
  if (text === "") return "puste";
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

function formatDateTime(value: string): string {
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
