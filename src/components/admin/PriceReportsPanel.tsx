"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Can from "@/components/admin/Can";
import { ArrowLeftIcon, CheckIcon, CloseIcon, ExternalIcon, FileIcon, FolderIcon, LayersIcon, RocketIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";
import {
  applyPriceSync,
  fetchPriceReportFile,
  fetchPriceReportFiles,
  fetchPriceReports,
  fetchPriceSyncPlan,
  generatePriceReports,
  togglePriceReport,
  type PriceReportFile,
  type PriceReportInvestment,
  type PriceReportStatus,
  type PriceSyncChange,
  type PriceSyncPlan,
  type Session,
} from "@/lib/adminApi";

/**
 * Ustawienia → "Raportowanie cen": katalog raportu każdej inwestycji (dataset.xml,
 * dataset.md5, dzienne CSV dla dane.gov.pl), podgląd plików i ręczne generowanie.
 * Pliki tworzy backend (PriceReportGenerator.php) codziennie z crona — panel tylko
 * je pokazuje i pozwala wygenerować od razu, np. po zmianie cen w historii cen.
 */
export default function PriceReportsPanel({ session }: { session: Session | null }) {
  const [investments, setInvestments] = useState<PriceReportInvestment[] | null>(null);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setInvestments(await fetchPriceReports(session));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać raportów.");
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch danych przy montowaniu, patrz src/app/admin/page.tsx
    void load();
  }, [load]);

  async function generate(key?: string) {
    setGenerating(key ?? "*");
    setNotice(null);
    try {
      const results = await generatePriceReports(session, key);
      const failed = results.filter((result) => result.result === "error");
      setNotice(
        failed.length > 0
          ? { tone: "error", text: `Wygenerowano ${results.length - failed.length} z ${results.length}. Błąd: ${failed.map((result) => result.name).join(", ")} — szczegóły w katalogu.` }
          : { tone: "ok", text: key ? "Raport wygenerowany." : `Wygenerowano raporty: ${results.filter((result) => result.result === "ok").length}.` }
      );
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Generowanie nie powiodło się." });
    } finally {
      setGenerating(null);
    }
  }

  async function toggle(investment: PriceReportInvestment, enabled: boolean) {
    let reason = "";
    if (!enabled) {
      const answer = window.prompt(
        `Wyłączyć raportowanie dla „${investment.name}”?\n\nCron i „Generuj wszystkie” przestaną dopisywać nowe pliki. Katalog i dataset.xml zostają (dane historyczne na dane.gov.pl).\n\nPowód (opcjonalnie):`,
        "Inwestycja zakończona — wszystkie lokale sprzedane"
      );
      if (answer === null) return;
      reason = answer;
    }
    setGenerating(investment.key);
    setNotice(null);
    try {
      await togglePriceReport(session, investment.key, enabled, reason);
      setNotice({ tone: "ok", text: enabled ? `Raportowanie „${investment.name}” włączone.` : `Raportowanie „${investment.name}” wyłączone.` });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Nie udało się zmienić ustawienia." });
    } finally {
      setGenerating(null);
    }
  }

  const open = investments?.find((investment) => investment.key === openKey) ?? null;

  if (open) {
    return (
      <FolderView
        investment={open}
        session={session}
        onBack={() => setOpenKey(null)}
        onGenerate={() => generate(open.key)}
        onToggle={(enabled) => toggle(open, enabled)}
        generating={generating !== null}
        notice={notice}
      />
    );
  }

  // Wyłączone (zakończone) inwestycje na końcu listy.
  const sorted = investments === null ? null : [...investments].sort((a, b) => Number(!a.enabled) - Number(!b.enabled));
  const disabledCount = investments?.filter((investment) => !investment.enabled).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Raportowanie cen</h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Ustawowe raporty cen ofertowych (art. 19b) dla dane.gov.pl — generowane codziennie z tabel historii cen. Każda inwestycja ma własny, stały adres
            pliku <code className="rounded bg-zinc-100 px-1 font-mono text-[12px]">dataset.xml</code>.
          </p>
        </div>
        <Can session={session} permission="reports.generate">
          <button onClick={() => generate()} disabled={generating !== null} className={`${ui.btnPrimary} shrink-0`}>
            {generating === "*" ? <Spinner /> : <RocketIcon className="h-4 w-4" />}
            {generating === "*" ? "Generowanie…" : "Generuj wszystkie"}
          </button>
        </Can>
      </div>

      {notice && <p className={notice.tone === "ok" ? ui.alertSuccess : ui.alertError}>{notice.text}</p>}
      {error && <p className={ui.alertError}>{error}</p>}

      {investments === null && !error && (
        <div className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-zinc-200/60" />
          ))}
        </div>
      )}

      {investments !== null && investments.length === 0 && (
        <div className={`${ui.card} px-6 py-12 text-center text-sm text-zinc-500`}>Żadna inwestycja nie ma jeszcze tabeli historii cen.</div>
      )}

      {investments !== null && investments.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(sorted ?? []).map((investment) => (
            <InvestmentCard key={investment.key} investment={investment} onOpen={() => setOpenKey(investment.key)} />
          ))}
        </div>
      )}

      {disabledCount > 0 && (
        <p className="text-xs text-zinc-500">
          Wyłączone z raportowania: {disabledCount}. Ich katalogi i dotychczasowe pliki zostają dostępne, ale nie powstają nowe raporty.
        </p>
      )}
    </div>
  );
}

function InvestmentCard({ investment, onOpen }: { investment: PriceReportInvestment; onOpen: () => void }) {
  const status = investment.status;
  const warnings = status?.warnings.length ?? 0;

  return (
    <button
      onClick={onOpen}
      className={`${ui.card} group flex flex-col p-4 text-left transition hover:border-zinc-300 hover:shadow-[0_4px_16px_-6px_rgba(16,24,40,0.12)] ${investment.enabled ? "" : "bg-zinc-50/80 opacity-70 hover:opacity-100"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-inset transition ${
            investment.enabled ? "bg-amber-50 text-amber-500 ring-amber-500/15 group-hover:bg-amber-100/70" : "bg-zinc-100 text-zinc-400 ring-zinc-300/40"
          }`}
        >
          <FolderIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900 group-hover:text-indigo-700">{investment.name}</div>
          <div className="truncate font-mono text-[11px] text-zinc-500">raporty-cen/{investment.key}/</div>
        </div>
        <StatusBadge investment={investment} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 text-center">
        <Stat label="Lokali" value={status?.rows ?? "—"} />
        <Stat label="Plików CSV" value={investment.csvCount} />
        <Stat label="Ostrzeżeń" value={warnings} tone={warnings > 0 ? "text-amber-600" : undefined} />
      </dl>

      {investment.enabled && status?.result === "error" && <p className="mt-3 line-clamp-2 text-xs text-red-600">{status.message}</p>}
      {!investment.enabled && investment.disabled?.reason && <p className="mt-3 line-clamp-2 text-xs text-zinc-500">{investment.disabled.reason}</p>}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div>
      <dd className={`text-base font-semibold tabular-nums ${tone ?? "text-zinc-900"}`}>{value}</dd>
      <dt className="text-[11px] text-zinc-500">{label}</dt>
    </div>
  );
}

/** "RRRR-MM-DD" w strefie Warszawy — do porównania z datą ostatniego raportu. */
function todayWarsaw(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
}

function StatusBadge({ investment }: { investment: PriceReportInvestment }) {
  const status = investment.status;
  if (!investment.enabled) return <span className={`${ui.badge} ${ui.badgeNeutral} shrink-0`}>Wyłączona</span>;
  if (!investment.published) return <span className={`${ui.badge} ${ui.badgeNeutral} shrink-0`}>Szkic</span>;
  if (!status) return <span className={`${ui.badge} ${ui.badgeNeutral} shrink-0`}>Brak raportu</span>;
  if (status.result === "error") return <span className={`${ui.badge} shrink-0 bg-red-50 text-red-700 ring-red-600/15`}>Błąd</span>;
  if (status.dataDate === todayWarsaw()) {
    return (
      <span className={`${ui.badge} ${ui.badgeSuccess} shrink-0`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Aktualny
      </span>
    );
  }
  return <span className={`${ui.badge} ${ui.badgeWarning} shrink-0`}>{status.dataDate ? formatDay(status.dataDate) : "Nieaktualny"}</span>;
}

function FolderView({
  investment,
  session,
  onBack,
  onGenerate,
  onToggle,
  generating,
  notice,
}: {
  investment: PriceReportInvestment;
  session: Session | null;
  onBack: () => void;
  onGenerate: () => void;
  onToggle: (enabled: boolean) => void;
  generating: boolean;
  notice: { tone: "ok" | "error"; text: string } | null;
}) {
  const [files, setFiles] = useState<PriceReportFile[] | null>(null);
  const [status, setStatus] = useState<PriceReportStatus | null>(investment.status);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PriceReportFile | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Odświeżane także po wygenerowaniu (investment.status zmienia się po load() w rodzicu).
  useEffect(() => {
    let cancelled = false;
    fetchPriceReportFiles(investment.key, session)
      .then((result) => {
        if (cancelled) return;
        setFiles(result.files);
        setStatus(result.status);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Nie udało się wczytać plików."));
    return () => {
      cancelled = true;
    };
  }, [investment.key, investment.status, session]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button onClick={onBack} aria-label="Wszystkie katalogi" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-zinc-50 hover:text-zinc-900">
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-zinc-900">{investment.name}</h3>
            <StatusBadge investment={{ ...investment, status }} />
          </div>
          <div className="truncate font-mono text-[11px] text-zinc-500">
            raporty-cen/{investment.key}/ · źródło: {investment.sourceSlug}
          </div>
        </div>
        <Can session={session} permission="reports.generate">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={investment.enabled}
              onClick={() => onToggle(!investment.enabled)}
              disabled={generating}
              className="group inline-flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:bg-zinc-50 disabled:opacity-50"
              title={investment.enabled ? "Wyłącz raportowanie (np. zakończona inwestycja)" : "Włącz raportowanie"}
            >
              <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${investment.enabled ? "bg-emerald-500" : "bg-zinc-300"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${investment.enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </span>
              {investment.enabled ? "Raportowanie włączone" : "Raportowanie wyłączone"}
            </button>
            <button onClick={() => setSyncing(true)} disabled={generating} className={ui.btnSecondary} title="Przenieś ceny z tabeli lokali na stronie inwestycji do rejestru cen">
              <LayersIcon className="h-4 w-4" />
              Synchronizuj z ofertą
            </button>
            {investment.enabled && (
              <button onClick={onGenerate} disabled={generating || !investment.published} className={ui.btnPrimary} title={investment.published ? undefined : "Strona historii cen jest szkicem"}>
                {generating ? <Spinner /> : <RocketIcon className="h-4 w-4" />}
                {generating ? "Generowanie…" : "Generuj teraz"}
              </button>
            )}
          </div>
        </Can>
      </div>

      {notice && <p className={notice.tone === "ok" ? ui.alertSuccess : ui.alertError}>{notice.text}</p>}

      {!investment.enabled && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600">
          <span className="font-medium text-zinc-800">Raportowanie wyłączone</span>
          {investment.disabled && (
            <span className="text-zinc-500">
              {" "}
              · {formatDateTime(investment.disabled.at)}
              {investment.disabled.by ? ` · ${investment.disabled.by}` : ""}
            </span>
          )}
          {investment.disabled?.reason && <div className="mt-0.5 text-zinc-500">{investment.disabled.reason}</div>}
          <div className="mt-1 text-xs text-zinc-500">Nowe pliki nie powstają; dotychczasowy dataset.xml i pliki CSV pozostają dostępne pod tymi samymi adresami.</div>
        </div>
      )}

      {status && (
        <div className={status.result === "error" ? ui.alertError : status.result === "skipped" ? "rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-600" : `${ui.card} px-4 py-3 text-sm text-zinc-700`}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium">{status.message}</span>
            <span className="text-xs text-zinc-500">ostatnie uruchomienie: {formatDateTime(status.generatedAt)}</span>
            {status.developer && <span className="text-xs text-zinc-500">deweloper: {status.developer}</span>}
          </div>
          {status.warnings.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-amber-700">Ostrzeżenia ({status.warnings.length})</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
                {status.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className={`${ui.card} divide-y divide-zinc-100`}>
        <UrlRow label="Adres zbioru dla dane.gov.pl" url={investment.datasetUrl} available={investment.hasDataset} />
        <UrlRow label="Suma kontrolna (MD5)" url={investment.md5Url} available={investment.hasDataset} />
      </div>

      {error && <p className={ui.alertError}>{error}</p>}

      <div className={`${ui.card} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
          <span className="text-sm font-semibold text-zinc-900">Pliki</span>
          <span className="text-xs tabular-nums text-zinc-500">{files?.length ?? 0}</span>
        </div>
        {files === null && !error && <div className="h-24 animate-pulse bg-zinc-50" />}
        {files !== null && files.length === 0 && <p className="px-5 py-8 text-center text-sm text-zinc-500">Katalog jest pusty — raport jeszcze nie powstał.</p>}
        {files !== null && files.length > 0 && (
          <ul className="divide-y divide-zinc-100">
            {files.map((file) => (
              <li key={file.name} className="group flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50/80">
                <FileBadge type={file.type} />
                <button onClick={() => setPreview(file)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium text-zinc-900 group-hover:text-indigo-700">{file.name}</div>
                  <div className="text-xs text-zinc-500">
                    {formatSize(file.size)} · {formatDateTime(file.modifiedAt)}
                  </div>
                </button>
                <button onClick={() => setPreview(file)} className={ui.btnSecondarySm}>
                  Podgląd
                </button>
                <a href={file.url} target="_blank" rel="noreferrer" className={ui.iconBtn} title="Otwórz plik" aria-label={`Otwórz ${file.name}`}>
                  <ExternalIcon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {preview && <FilePreview investmentKey={investment.key} file={preview} session={session} onClose={() => setPreview(null)} />}
      {syncing && (
        <SyncDialog
          investment={investment}
          session={session}
          onClose={() => setSyncing(false)}
          onGenerate={() => {
            setSyncing(false);
            onGenerate();
          }}
        />
      )}
    </div>
  );
}

const SYNC_GROUPS: { action: PriceSyncChange["action"]; title: string; hint: string; tone: string }[] = [
  { action: "update", title: "Zmienione ceny", hint: "nowa cena i data jej obowiązywania", tone: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  { action: "create", title: "Nowe lokale", hint: "są w ofercie, nie ma ich w rejestrze", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" },
  { action: "remove", title: "Sprzedane", hint: "znikną z rejestru — raport obejmuje lokale w sprzedaży", tone: "bg-red-50 text-red-700 ring-red-600/15" },
];

/**
 * "Synchronizuj z ofertą": podgląd zmian, jakie tabela lokali ze strony inwestycji wprowadzi do rejestru cen
 * (PriceRegisterSync.php), wybór i zapis. Nic nie trafia do rejestru przed kliknięciem "Zapisz w rejestrze".
 */
function SyncDialog({ investment, session, onClose, onGenerate }: { investment: PriceReportInvestment; session: Session | null; onClose: () => void; onGenerate: () => void }) {
  const [plan, setPlan] = useState<PriceSyncPlan | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ applied: number; created: number; updated: number; removed: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPriceSyncPlan(session, investment.key)
      .then((loaded) => {
        if (cancelled) return;
        setPlan(loaded);
        setSelected(new Set(loaded.changes.map((change) => change.id)));
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Nie udało się przygotować podglądu."));
    return () => {
      cancelled = true;
    };
  }, [investment.key, session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  function toggle(ids: string[], on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      setResult(await applyPriceSync(session, investment.key, [...selected]));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Zapis nie powiódł się.");
    } finally {
      setSaving(false);
    }
  }

  const changes = plan?.changes ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Synchronizacja z ofertą">
      <div className="absolute inset-0" onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-zinc-900">Synchronizacja z ofertą · {investment.name}</div>
            <div className="mt-0.5 text-xs text-zinc-500">
              Ceny z tabeli lokali na stronie inwestycji{plan ? ` (${plan.offerSlug})` : ""} trafiają do rejestru cen w odpowiednie kolumny raportu — bez przeliczania.
            </div>
          </div>
          <button onClick={onClose} disabled={saving} aria-label="Zamknij" className={ui.iconBtn}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
          {error && <p className={ui.alertError}>{error}</p>}
          {!plan && !error && <div className="h-40 animate-pulse rounded-lg bg-zinc-100" />}

          {result && (
            <p className={ui.alertSuccess}>
              Zapisano w rejestrze: {result.applied} (zmienione ceny: {result.updated}, nowe: {result.created}, usunięte: {result.removed}). Raport dla dane.gov.pl
              uwzględni je przy najbliższym generowaniu; strona historii cen — po publikacji serwisu.
            </p>
          )}

          {plan && !result && (
            <>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
                <span>
                  Bez zmian: <b className="font-semibold tabular-nums text-zinc-800">{plan.unchanged}</b>
                </span>
                <span>
                  Do zapisania: <b className="font-semibold tabular-nums text-zinc-800">{changes.length}</b>
                </span>
                {plan.untouched.length > 0 && (
                  <span title={plan.untouched.join(", ")}>
                    Tylko w rejestrze (nie ruszane): <b className="font-semibold tabular-nums text-zinc-800">{plan.untouched.length}</b>
                  </span>
                )}
              </div>

              {plan.warnings.length > 0 && (
                <ul className="list-disc space-y-1 rounded-lg border border-amber-200 bg-amber-50 py-2.5 pl-8 pr-3 text-xs text-amber-800">
                  {plan.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              )}

              {changes.length === 0 && <p className="rounded-lg bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">Rejestr zgadza się z ofertą — nie ma nic do zapisania.</p>}

              {SYNC_GROUPS.map((group) => {
                const items = changes.filter((change) => change.action === group.action);
                if (items.length === 0) return null;
                const ids = items.map((item) => item.id);
                const all = ids.every((id) => selected.has(id));
                return (
                  <section key={group.action} className={`${ui.card} overflow-hidden`}>
                    <label className="flex cursor-pointer items-center gap-3 border-b border-zinc-100 bg-zinc-50/70 px-4 py-2.5">
                      <input type="checkbox" checked={all} onChange={(event) => toggle(ids, event.target.checked)} className="h-4 w-4 rounded border-zinc-300" />
                      <span className="text-sm font-semibold text-zinc-900">{group.title}</span>
                      <span className={`${ui.badge} ${group.tone}`}>{items.length}</span>
                      <span className="ml-auto hidden text-xs text-zinc-500 sm:inline">{group.hint}</span>
                    </label>
                    <ul className="divide-y divide-zinc-100">
                      {items.map((change) => (
                        <li key={change.id}>
                          <label className="flex cursor-pointer gap-3 px-4 py-2.5 hover:bg-zinc-50/60">
                            <input type="checkbox" checked={selected.has(change.id)} onChange={(event) => toggle([change.id], event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-zinc-900">{change.unit}</div>
                              {change.fields.length > 0 && (
                                <dl className="mt-1 grid gap-x-4 gap-y-0.5 text-xs sm:grid-cols-2">
                                  {change.fields
                                    .filter((field) => field.key !== "unit")
                                    .map((field) => (
                                      <div key={field.key} className="flex gap-1.5">
                                        <dt className="shrink-0 text-zinc-500">{field.label}:</dt>
                                        <dd className="min-w-0 truncate tabular-nums text-zinc-800">
                                          {field.from && <span className="text-zinc-400 line-through">{field.from}</span>}
                                          {field.from && " → "}
                                          {field.to}
                                        </dd>
                                      </div>
                                    ))}
                                </dl>
                              )}
                              {change.note && <p className="mt-1 text-xs text-amber-700">{change.note}</p>}
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">
          {result ? (
            <>
              <button onClick={onClose} className={ui.btnSecondary}>
                Zamknij
              </button>
              {investment.enabled && investment.published && (
                <Can session={session} permission="reports.generate">
                  <button onClick={onGenerate} className={ui.btnPrimary}>
                    <RocketIcon className="h-4 w-4" />
                    Generuj raport teraz
                  </button>
                </Can>
              )}
            </>
          ) : (
            <>
              <button onClick={onClose} disabled={saving} className={ui.btnSecondary}>
                Anuluj
              </button>
              <button onClick={save} disabled={saving || selected.size === 0} className={ui.btnPrimary}>
                {saving ? <Spinner /> : <CheckIcon className="h-4 w-4" />}
                {saving ? "Zapisywanie…" : `Zapisz w rejestrze (${selected.size})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UrlRow({ label, url, available }: { label: string; url: string; available: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // brak uprawnień do schowka — adres i tak jest zaznaczalny
    }
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="w-56 shrink-0 text-xs font-medium text-zinc-500">{label}</div>
      <code className="min-w-0 flex-1 truncate rounded-md bg-zinc-50 px-2.5 py-1.5 font-mono text-[12px] text-zinc-700 ring-1 ring-inset ring-zinc-200/70" title={url}>
        {url}
      </code>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={copy} className={ui.btnSecondarySm}>
          {copied ? <CheckIcon className="h-3.5 w-3.5 text-emerald-600" /> : null}
          {copied ? "Skopiowano" : "Kopiuj"}
        </button>
        {available && (
          <a href={url} target="_blank" rel="noreferrer" className={ui.iconBtn} title="Otwórz" aria-label={`Otwórz ${label}`}>
            <ExternalIcon className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function FileBadge({ type }: { type: string }) {
  const tone = type === "csv" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15" : type === "xml" ? "bg-indigo-50 text-indigo-700 ring-indigo-600/15" : "bg-zinc-100 text-zinc-600 ring-zinc-500/15";
  return (
    <span className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${tone}`}>
      <FileIcon className="h-4 w-4 opacity-40" />
      <span className="absolute bottom-0.5 text-[8px] font-bold uppercase tracking-wide">{type}</span>
    </span>
  );
}

function FilePreview({ investmentKey, file, session, onClose }: { investmentKey: string; file: PriceReportFile; session: Session | null; onClose: () => void }) {
  const [data, setData] = useState<{ content: string; truncated: boolean } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPriceReportFile(investmentKey, file.name, session)
      .then((result) => setData({ content: result.content, truncated: result.truncated }))
      .catch((err) => setError(err instanceof Error ? err.message : "Nie udało się wczytać pliku."));
  }, [investmentKey, file.name, session]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const table = useMemo(() => (data && file.type === "csv" ? parseCsv(data.content.replace(/^﻿/, "")) : null), [data, file.type]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={file.name}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-3.5">
          <FileBadge type={file.type} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-zinc-900">{file.name}</div>
            <div className="text-xs text-zinc-500">
              {formatSize(file.size)}
              {table && ` · ${table.length - 1} wierszy · ${table[0]?.length ?? 0} kolumn`}
            </div>
          </div>
          <a href={file.url} target="_blank" rel="noreferrer" className={ui.btnSecondarySm}>
            <ExternalIcon className="h-3.5 w-3.5" />
            Otwórz
          </a>
          <button onClick={onClose} aria-label="Zamknij" className={ui.iconBtn}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-zinc-50/60">
          {error && <p className={`${ui.alertError} m-5`}>{error}</p>}
          {!data && !error && <div className="m-5 h-40 animate-pulse rounded-lg bg-zinc-200/60" />}
          {data && table && (
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_rgba(228,228,231,1)]">
                <tr>
                  <th className="sticky left-0 bg-white px-3 py-2 text-left font-medium text-zinc-400">#</th>
                  {table[0].map((header, index) => (
                    <th key={index} className="min-w-[10rem] max-w-[18rem] px-3 py-2 text-left align-bottom font-medium leading-snug text-zinc-600" title={header}>
                      <span className="line-clamp-3">{header}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-zinc-100 bg-white even:bg-zinc-50/50">
                    <td className="sticky left-0 bg-inherit px-3 py-1.5 tabular-nums text-zinc-400">{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className={`whitespace-nowrap px-3 py-1.5 ${cell === "X" ? "text-zinc-300" : "text-zinc-800"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data && !table && <pre className="whitespace-pre-wrap break-all p-5 font-mono text-[12px] leading-relaxed text-zinc-800">{data.content}</pre>}
          {data?.truncated && <p className="px-5 pb-4 text-xs text-amber-700">Pokazano początek pliku (powyżej 2 MB) — całość pod przyciskiem „Otwórz”.</p>}
        </div>
      </div>
    </div>
  );
}

/** CSV rozdzielany ";" z polami w cudzysłowach (format raportów — fputcsv w PriceReportGenerator.php). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function Spinner() {
  return <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function formatDay(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("pl-PL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
