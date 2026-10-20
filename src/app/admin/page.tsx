"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { ChartIcon, CheckIcon, ExternalIcon, FileIcon, LayersIcon, PagesIcon, RocketIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";
import { useMounted } from "@/components/admin/useMounted";
import { can } from "@/lib/permissions";
import {
  AdminApiError,
  fetchActivity,
  fetchMe,
  fetchPages,
  fetchPriceReports,
  generatePriceReports,
  loadSession,
  storeSession,
  type ActivityEntry,
  type PageSummary,
  type PriceReportInvestment,
  type Session,
} from "@/lib/adminApi";

/**
 * /admin — cockpit: start panelu. Zbiera najważniejsze rzeczy z istniejących
 * endpointów (strony, raporty cen, aktywność) i z nich wylicza alerty: brakujące
 * lub błędne dzisiejsze raporty cen, inwestycje bez tabeli historii cen,
 * inwestycje w szkicu. Każdy blok pokazuje się tylko z odpowiednim uprawnieniem
 * (pages.list / reports.list / activity.list) — backend i tak sprawdza każde żądanie.
 */

type Loaded<T> = { status: "loading" } | { status: "ready"; data: T } | { status: "error"; message: string } | { status: "hidden" };

type Alert = { tone: "error" | "warning" | "info"; title: string; detail?: string; href?: string; action?: string };

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "zalogował(a) się",
  "pages.create": "utworzył(a) stronę",
  "pages.update": "zapisał(a) stronę",
  "pages.delete": "usunął/usunęła stronę",
  "build.trigger": "uruchomił(a) build",
  "build.trigger.full": "uruchomił(a) pełny build",
  "blog.article.create": "dodał(a) wpis bloga (API)",
  "blog.article.update": "zaktualizował(a) wpis bloga (API)",
  "price-reports.generate": "wygenerował(a) raporty cen",
  "users.create": "dodał(a) konto",
  "users.delete": "usunął/usunęła konto",
  "roles.create": "dodał(a) rolę",
  "roles.delete": "usunął/usunęła rolę",
  "account.update": "zmienił(a) dane konta",
};

/** "RRRR-MM-DD" w strefie Warszawy (daty raportów są liczone na serwerze w tej strefie). */
function todayWarsaw(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
}

function sectionOf(slug: string): "home" | "inwestycje" | "kgd-building" | "blog" | "inne" {
  if (slug === "/") return "home";
  const first = slug.split("/").filter(Boolean)[0] ?? "";
  if (first === "blog") return "blog";
  if (first === "inwestycja" || first === "inwestycje") return "inwestycje";
  if (first === "kgd-building") return "kgd-building";
  return "inne";
}

/** Strona główna inwestycji: /inwestycja/<x> (bez podstron typu historia-cen). */
function isInvestmentRoot(slug: string): boolean {
  return /^\/inwestycja\/[^/]+$/.test(slug);
}

export default function AdminCockpit() {
  const router = useRouter();
  const mounted = useMounted();
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [ready, setReady] = useState(false);
  const [pages, setPages] = useState<Loaded<PageSummary[]>>({ status: "loading" });
  const [reports, setReports] = useState<Loaded<PriceReportInvestment[]>>({ status: "loading" });
  const [activity, setActivity] = useState<Loaded<ActivityEntry[]>>({ status: "loading" });
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const goToLogin = useCallback(() => {
    storeSession(null);
    setSession(null);
    router.replace("/admin/login");
  }, [router]);

  const loadReports = useCallback(async (current: Session) => {
    try {
      setReports({ status: "ready", data: await fetchPriceReports(current) });
    } catch (error) {
      setReports({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
    }
  }, []);

  useEffect(() => {
    const current = session;
    (async () => {
      let next: Session;
      try {
        const me = await fetchMe(current);
        next = { token: current?.token ?? "", login: me.login ?? current?.login ?? "", role: me.role ?? current?.role ?? "", permissions: me.permissions };
        setSession(next);
        setReady(true);
      } catch (error) {
        if (error instanceof AdminApiError && error.status === 401) goToLogin();
        else setPages({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." });
        return;
      }

      const settle = <T,>(promise: Promise<T>, set: (value: Loaded<T>) => void) =>
        promise.then((data) => set({ status: "ready", data })).catch((error) => set({ status: "error", message: error instanceof Error ? error.message : "Nieznany błąd." }));

      if (can(next.permissions, "pages.list")) void settle(fetchPages(next), setPages);
      else setPages({ status: "hidden" });
      if (can(next.permissions, "reports.list")) void loadReports(next);
      else setReports({ status: "hidden" });
      if (can(next.permissions, "activity.list")) void settle(fetchActivity(12, 0, next).then((result) => result.items), setActivity);
      else setActivity({ status: "hidden" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tylko przy montowaniu
  }, []);

  async function handleGenerate() {
    if (!session) return;
    setGenerating(true);
    setNotice(null);
    try {
      const results = await generatePriceReports(session);
      const failed = results.filter((result) => result.result === "error").length;
      setNotice(failed > 0 ? { tone: "error", text: `Wygenerowano z błędami (${failed}). Szczegóły w Raportowaniu cen.` } : { tone: "ok", text: "Raporty na dziś wygenerowane." });
      await loadReports(session);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Generowanie nie powiodło się." });
    } finally {
      setGenerating(false);
    }
  }

  const today = todayWarsaw();

  // ----- wyliczenia -----
  const pageStats = useMemo(() => {
    if (pages.status !== "ready") return null;
    const list = pages.data;
    const published = list.filter((page) => page.status === "published");
    const bySection = (key: ReturnType<typeof sectionOf>) => list.filter((page) => sectionOf(page.slug) === key);
    const investments = list.filter((page) => isInvestmentRoot(page.slug));
    const recent = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
    return {
      total: list.length,
      published: published.length,
      drafts: list.length - published.length,
      investments,
      investmentsLive: investments.filter((page) => page.status === "published").length,
      blog: bySection("blog").length,
      blogDrafts: bySection("blog").filter((page) => page.status !== "published").length,
      recent,
    };
  }, [pages]);

  const reportStats = useMemo(() => {
    if (reports.status !== "ready") return null;
    const active = reports.data.filter((item) => item.published && item.enabled);
    const fresh = active.filter((item) => item.status?.result === "ok" && item.status.dataDate === today);
    const errors = active.filter((item) => item.status?.result === "error");
    const missing = active.filter((item) => !fresh.includes(item) && !errors.includes(item));
    const warnings = active.reduce((sum, item) => sum + (item.status?.warnings.length ?? 0), 0);
    return { active, fresh, errors, missing, warnings };
  }, [reports, today]);

  const alerts = useMemo(() => {
    const list: Alert[] = [];
    if (reportStats) {
      for (const item of reportStats.errors) {
        list.push({ tone: "error", title: `Raport cen: ${item.name} — błąd`, detail: item.status?.message, href: "/admin/raportowanie-cen", action: "Sprawdź" });
      }
      if (reportStats.missing.length > 0) {
        list.push({
          tone: "warning",
          title: `Brak dzisiejszego raportu cen (${reportStats.missing.length})`,
          detail: reportStats.missing.map((item) => item.name).join(", "),
          href: "/admin/raportowanie-cen",
          action: "Raportowanie",
        });
      }
    }
    if (pageStats && reports.status === "ready") {
      const withReport = new Set(reports.data.map((item) => item.sourceSlug.replace(/\/historia-cen$/, "")));
      const noHistory = pageStats.investments.filter((page) => page.status === "published" && !withReport.has(page.slug));
      if (noHistory.length > 0) {
        list.push({
          tone: "warning",
          title: `Inwestycje bez tabeli historii cen (${noHistory.length})`,
          detail: `${noHistory.map((page) => page.title.split("|")[0].trim()).join(", ")} — nie mają raportu dla dane.gov.pl.`,
          href: "/admin/strony",
          action: "Strony",
        });
      }
    }
    if (pageStats) {
      const draftInvestments = pageStats.investments.filter((page) => page.status !== "published");
      if (draftInvestments.length > 0) {
        list.push({
          tone: "info",
          title: `Inwestycje w szkicu (${draftInvestments.length})`,
          detail: `${draftInvestments.map((page) => page.title.split("|")[0].trim()).join(", ")} — niewidoczne na stronie po buildzie.`,
          href: "/admin/strony",
          action: "Strony",
        });
      }
    }
    return list;
  }, [pageStats, reportStats, reports]);

  const lastBuild = activity.status === "ready" ? activity.data.find((entry) => entry.action.startsWith("build.trigger")) : undefined;
  const hour = Number(new Intl.DateTimeFormat("pl-PL", { hour: "numeric", hour12: false, timeZone: "Europe/Warsaw" }).format(new Date()));
  const greeting = hour < 12 ? "Dzień dobry" : hour < 18 ? "Cześć" : "Dobry wieczór";

  return (
    <AdminShell title="Cockpit" session={session} onLogout={goToLogin}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="h-5 text-sm text-zinc-500">{mounted && new Date().toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" })}</p>
            <h2 className="mt-1 h-8 text-2xl font-semibold tracking-tight text-zinc-900">
              {mounted ? greeting : "Cockpit"}
              {mounted && session?.login ? `, ${session.login}` : ""}
            </h2>
          </div>
          {ready && alerts.length === 0 && reportStats && pageStats && (
            <span className={`${ui.badge} ${ui.badgeSuccess} self-start px-3 py-1 text-xs sm:self-auto`}>
              <CheckIcon className="h-3.5 w-3.5" />
              Wszystko w porządku
            </span>
          )}
        </div>

        {notice && <p className={notice.tone === "ok" ? ui.alertSuccess : ui.alertError}>{notice.text}</p>}

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={<ChartIcon className="h-4 w-4" />}
            label="Raporty cen na dziś"
            hidden={reports.status === "hidden"}
            loading={reports.status === "loading"}
            value={reportStats ? `${reportStats.fresh.length}/${reportStats.active.length}` : "—"}
            hint={reportStats ? (reportStats.fresh.length === reportStats.active.length ? "komplet" : `brakuje ${reportStats.active.length - reportStats.fresh.length}`) : undefined}
            tone={reportStats ? (reportStats.errors.length > 0 ? "error" : reportStats.missing.length > 0 ? "warning" : "ok") : undefined}
          />
          <Kpi
            icon={<PagesIcon className="h-4 w-4" />}
            label="Strony opublikowane"
            hidden={pages.status === "hidden"}
            loading={pages.status === "loading"}
            value={pageStats ? String(pageStats.published) : "—"}
            hint={pageStats ? `z ${pageStats.total} · szkice: ${pageStats.drafts}` : undefined}
          />
          <Kpi
            icon={<LayersIcon className="h-4 w-4" />}
            label="Inwestycje aktywne"
            hidden={pages.status === "hidden"}
            loading={pages.status === "loading"}
            value={pageStats ? String(pageStats.investmentsLive) : "—"}
            hint={pageStats ? `z ${pageStats.investments.length} w panelu` : undefined}
          />
          <Kpi
            icon={<FileIcon className="h-4 w-4" />}
            label="Wpisy bloga"
            hidden={pages.status === "hidden"}
            loading={pages.status === "loading"}
            value={pageStats ? String(pageStats.blog) : "—"}
            hint={pageStats ? (pageStats.blogDrafts > 0 ? `szkice: ${pageStats.blogDrafts}` : "wszystkie opublikowane") : undefined}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            {/* Alerty */}
            <Card title="Wymaga uwagi" count={alerts.length}>
              {(pages.status === "loading" || reports.status === "loading") && <Skeleton rows={2} />}
              {pages.status !== "loading" && reports.status !== "loading" && alerts.length === 0 && (
                <div className="flex items-center gap-3 px-5 py-6 text-sm text-zinc-600">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/15">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  Brak spraw do załatwienia — raporty z dziś są kompletne.
                </div>
              )}
              {alerts.length > 0 && (
                <ul className="divide-y divide-zinc-100">
                  {alerts.map((alert, index) => (
                    <li key={index} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alert.tone === "error" ? "bg-red-500" : alert.tone === "warning" ? "bg-amber-400" : "bg-indigo-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-zinc-900">{alert.title}</div>
                        {alert.detail && <div className="mt-0.5 text-[13px] text-zinc-500">{alert.detail}</div>}
                      </div>
                      {alert.href && (
                        <Link href={alert.href} className={`${ui.btnSecondarySm} shrink-0`}>
                          {alert.action ?? "Otwórz"}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Raporty cen */}
            {reports.status !== "hidden" && (
              <Card
                title="Raporty cen — dziś"
                subtitle={reportStats && reportStats.warnings > 0 ? `${reportStats.warnings} ostrzeżeń w danych` : "dane.gov.pl · art. 19b"}
                action={
                  mounted && can(session?.permissions, "reports.generate") ? (
                    <button onClick={handleGenerate} disabled={generating || reports.status !== "ready"} className={ui.btnSecondarySm}>
                      <RocketIcon className="h-3.5 w-3.5" />
                      {generating ? "Generowanie…" : "Generuj brakujące"}
                    </button>
                  ) : null
                }
              >
                {reports.status === "loading" && <Skeleton rows={4} />}
                {reports.status === "error" && <p className={`${ui.alertError} m-4`}>{reports.message}</p>}
                {reportStats && (
                  <>
                    <div className="px-5 pt-4">
                      <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div className="bg-emerald-500" style={{ width: `${(reportStats.fresh.length / Math.max(1, reportStats.active.length)) * 100}%` }} />
                        <div className="bg-amber-400" style={{ width: `${(reportStats.missing.length / Math.max(1, reportStats.active.length)) * 100}%` }} />
                        <div className="bg-red-500" style={{ width: `${(reportStats.errors.length / Math.max(1, reportStats.active.length)) * 100}%` }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <Legend dot="bg-emerald-500" label={`aktualne ${reportStats.fresh.length}`} />
                        <Legend dot="bg-amber-400" label={`brak na dziś ${reportStats.missing.length}`} />
                        <Legend dot="bg-red-500" label={`błąd ${reportStats.errors.length}`} />
                      </div>
                    </div>
                    <ul className="mt-3 grid divide-y divide-zinc-100 border-t border-zinc-100 sm:grid-cols-2 sm:divide-y-0">
                      {reportStats.active.map((item) => {
                        const fresh = reportStats.fresh.includes(item);
                        const error = reportStats.errors.includes(item);
                        return (
                          <li key={item.key} className="flex items-center gap-3 border-zinc-100 px-5 py-2.5 sm:border-b sm:odd:border-r">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${fresh ? "bg-emerald-500" : error ? "bg-red-500" : "bg-amber-400"}`} />
                            <span className="min-w-0 flex-1 truncate text-sm text-zinc-800">{item.name}</span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                              {error ? "błąd" : fresh ? `${item.status?.rows ?? 0} lok.` : item.status?.dataDate ? `ostatni ${item.status.dataDate.slice(5).split("-").reverse().join(".")}` : "brak"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </Card>
            )}

            {/* Ostatnio edytowane */}
            {pages.status !== "hidden" && (
              <Card title="Ostatnio edytowane strony" action={<Link href="/admin/strony" className={ui.btnSecondarySm}>Wszystkie strony</Link>}>
                {pages.status === "loading" && <Skeleton rows={4} />}
                {pages.status === "error" && <p className={`${ui.alertError} m-4`}>{pages.message}</p>}
                {pageStats && (
                  <ul className="divide-y divide-zinc-100">
                    {pageStats.recent.map((page) => (
                      <li key={page.slug} className="flex items-center gap-3 px-5 py-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-zinc-200/80 text-zinc-400">
                          <FileIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-zinc-900">{page.title.split("|")[0].trim()}</div>
                          <div className="truncate font-mono text-[11px] text-zinc-500">{page.slug}</div>
                        </div>
                        <span className={`${ui.badge} ${page.status === "published" ? ui.badgeSuccess : ui.badgeWarning} shrink-0`}>{page.status === "published" ? "Opublikowana" : "Szkic"}</span>
                        <span className="hidden w-24 shrink-0 text-right text-xs text-zinc-500 sm:block">{formatDate(page.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Skróty */}
            <Card title="Szybkie akcje">
              <div className="grid gap-2 p-4">
                <QuickLink href="/admin/strony" label="Edytuj strony" hint="lista stron i wpisów" />
                <QuickLink href="/admin/raportowanie-cen" label="Raportowanie cen" hint="katalogi dataset.xml" />
                <QuickLink href="/admin/settings" label="Ustawienia" hint="konta, role, uprawnienia" />
                <a href="/" target="_blank" rel="noreferrer" className="group flex items-center justify-between rounded-lg border border-zinc-200/80 px-3.5 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50">
                  <span>
                    <span className="block text-sm font-medium text-zinc-900">Otwórz stronę</span>
                    <span className="block text-xs text-zinc-500">kgd-group.pl</span>
                  </span>
                  <ExternalIcon className="h-4 w-4 text-zinc-400 group-hover:text-zinc-700" />
                </a>
              </div>
              {activity.status === "ready" && (
                <div className="border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500">
                  Ostatni build: {lastBuild ? `${formatDateTime(lastBuild.createdAt)} · ${lastBuild.login ?? "system"}` : "brak w historii"}
                </div>
              )}
            </Card>

            {/* Aktywność */}
            {activity.status !== "hidden" && (
              <Card title="Ostatnia aktywność">
                {activity.status === "loading" && <Skeleton rows={5} />}
                {activity.status === "error" && <p className={`${ui.alertError} m-4`}>{activity.message}</p>}
                {activity.status === "ready" && activity.data.length === 0 && <p className="px-5 py-6 text-sm text-zinc-500">Brak zdarzeń.</p>}
                {activity.status === "ready" && activity.data.length > 0 && (
                  <ol className="relative px-5 py-4">
                    <span aria-hidden className="absolute bottom-6 left-[27px] top-6 w-px bg-zinc-200" />
                    {activity.data.map((entry) => (
                      <li key={entry.id} className="relative flex gap-3 py-1.5">
                        <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-zinc-300 ring-1 ring-zinc-200" />
                        <div className="min-w-0 text-[13px]">
                          <span className="font-medium text-zinc-900">{entry.login ?? "system"}</span>{" "}
                          <span className="text-zinc-600">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                          {entry.target && <span className="block truncate font-mono text-[11px] text-zinc-500">{entry.target}</span>}
                          <span className="block text-[11px] text-zinc-400">{formatDateTime(entry.createdAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Kpi({ icon, label, value, hint, tone, loading, hidden }: { icon: ReactNode; label: string; value: string; hint?: string; tone?: "ok" | "warning" | "error"; loading: boolean; hidden: boolean }) {
  if (hidden) return null;
  const accent = tone === "error" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-zinc-900";
  return (
    <div className={`${ui.card} p-4`}>
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-100 text-zinc-500 ring-1 ring-inset ring-zinc-200/60">{icon}</span>
        {label}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded-md bg-zinc-200/70" />
      ) : (
        <div className={`mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums ${accent}`}>{value}</div>
      )}
      <div className="mt-2 h-4 text-xs text-zinc-500">{!loading && hint}</div>
    </div>
  );
}

function Card({ title, subtitle, count, action, children }: { title: string; subtitle?: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${ui.card} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            {title}
            {count !== undefined && count > 0 && <span className={`${ui.badge} ${ui.badgeWarning} tabular-nums`}>{count}</span>}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between rounded-lg border border-zinc-200/80 px-3.5 py-2.5 transition hover:border-zinc-300 hover:bg-zinc-50">
      <span>
        <span className="block text-sm font-medium text-zinc-900 group-hover:text-indigo-700">{label}</span>
        <span className="block text-xs text-zinc-500">{hint}</span>
      </span>
      <span className="text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-600">→</span>
    </Link>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="animate-pulse space-y-2.5 p-5">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-4 rounded bg-zinc-200/60" style={{ width: `${90 - index * 9}%` }} />
      ))}
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string): string {
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
