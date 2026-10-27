"use client";

import { useEffect, useState } from "react";
import { createApiToken, fetchApiTokens, revokeApiToken, type ApiTokenRecord, type Session } from "@/lib/adminApi";
import { CheckIcon } from "./icons";
import { ui } from "./ui";

const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: "30 dni", days: 30 },
  { label: "90 dni", days: 90 },
  { label: "1 rok", days: 365 },
  { label: "Bez wygaśnięcia", days: null },
];

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

function tokenState(token: ApiTokenRecord): { label: string; className: string } {
  if (token.revokedAt) return { label: "Cofnięty", className: "bg-zinc-100 text-zinc-500 ring-zinc-500/15" };
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return { label: "Wygasły", className: "bg-amber-50 text-amber-700 ring-amber-600/20" };
  return { label: "Aktywny", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/15" };
}

/**
 * Ustawienia → Tokeny API: tokeny REST API v1 (backend/v1.php). Pełny token jest pokazywany TYLKO
 * raz, zaraz po utworzeniu — w bazie zostaje wyłącznie jego hash. Cofnięcie działa natychmiast.
 */
export default function ApiTokensPanel({ session }: { session: Session | null }) {
  const [tokens, setTokens] = useState<ApiTokenRecord[] | null>(null);
  const [scopes, setScopes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["pages:read"]);
  const [expiry, setExpiry] = useState<number | null>(90);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ token: string; record: ApiTokenRecord } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchApiTokens(session)
      .then((result) => {
        if (cancelled) return;
        setTokens(result.tokens);
        setScopes(result.scopes);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Nie udało się wczytać tokenów."));
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const result = await createApiToken({ name: name.trim(), scopes: selectedScopes, expiresInDays: expiry }, session);
      setCreated(result);
      setCopied(false);
      setTokens((prev) => [result.record, ...(prev ?? [])]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć tokenu.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(token: ApiTokenRecord) {
    if (!window.confirm(`Cofnąć token „${token.name}”? Integracje, które go używają, od razu stracą dostęp.`)) return;
    try {
      const updated = await revokeApiToken(token.id, session);
      setTokens((prev) => (prev ?? []).map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się cofnąć tokenu.");
    }
  }

  const exampleUrl = "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills&fields=heroTitle";

  return (
    <div className="space-y-6">
      {created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="text-sm font-semibold text-emerald-900">Token „{created.record.name}” utworzony</div>
          <p className="mt-1 text-[13px] text-emerald-800">Skopiuj go teraz — <strong>nie będzie można go zobaczyć ponownie</strong>. W bazie zapisaliśmy tylko jego skrót.</p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={created.token} onFocus={(event) => event.target.select()} className={`${ui.input} font-mono text-[13px]`} />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(created.token);
                setCopied(true);
              }}
              className={ui.btnPrimarySm}
            >
              {copied ? (
                <>
                  <CheckIcon className="h-3.5 w-3.5" /> Skopiowano
                </>
              ) : (
                "Kopiuj"
              )}
            </button>
          </div>
          <div className="mt-4 text-[12px] font-medium text-emerald-900">Przykład użycia</div>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[12px] leading-relaxed text-zinc-100">
            {`curl -H "Authorization: Bearer ${created.token}" \\\n  "${exampleUrl}"`}
          </pre>
          <button type="button" onClick={() => setCreated(null)} className="mt-3 text-[12px] font-medium text-emerald-800 hover:text-emerald-950">
            Zapisałem token, zamknij
          </button>
        </div>
      )}

      <div className={`${ui.card} p-5`}>
        <div className="text-sm font-semibold text-zinc-900">Nowy token</div>
        <p className={ui.hint}>Dla każdej integracji osobny token — wtedy można go cofnąć bez wpływu na inne.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label className="block">
            <span className={ui.label}>Nazwa</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="np. Integracja CRM" maxLength={120} className={ui.input} />
          </label>
          <label className="block">
            <span className={ui.label}>Ważność</span>
            <select value={expiry ?? ""} onChange={(event) => setExpiry(event.target.value === "" ? null : Number(event.target.value))} className={ui.input}>
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.label} value={option.days ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className={ui.label}>Zakres dostępu</legend>
          <div className="space-y-2">
            {Object.entries(scopes).map(([scope, description]) => (
              <label key={scope} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope)}
                  onChange={(event) => setSelectedScopes((prev) => (event.target.checked ? [...prev, scope] : prev.filter((item) => item !== scope)))}
                  className="mt-0.5 h-4 w-4 accent-indigo-600"
                />
                <span>
                  <code className="font-mono text-[12px] text-zinc-800">{scope}</code>
                  <span className="block text-[12px] text-zinc-500">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex items-center gap-3">
          <button type="button" onClick={() => void handleCreate()} disabled={busy || name.trim() === "" || selectedScopes.length === 0} className={ui.btnPrimary}>
            {busy ? "Tworzenie…" : "Utwórz token"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.cardHeader}>
          <div className="text-sm font-semibold text-zinc-900">Tokeny</div>
          <span className="text-xs text-zinc-500">Pola są dostępne w API tylko wtedy, gdy mają nadany klucz API (w edytorze strony).</span>
        </div>
        {tokens === null ? (
          <div className="h-24 animate-pulse bg-zinc-50" />
        ) : tokens.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">Brak tokenów.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-2.5">Nazwa</th>
                  <th className="px-3 py-2.5">Token</th>
                  <th className="px-3 py-2.5">Zakres</th>
                  <th className="px-3 py-2.5">Ostatnie użycie</th>
                  <th className="px-3 py-2.5">Wygasa</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => {
                  const state = tokenState(token);
                  return (
                    <tr key={token.id} className="border-b border-zinc-100 last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-900">{token.name}</div>
                        <div className="text-[11px] text-zinc-500">
                          {formatDate(token.createdAt)}
                          {token.createdBy ? ` · ${token.createdBy}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[12px] text-zinc-600">{token.prefix}…</td>
                      <td className="px-3 py-3 font-mono text-[12px] text-zinc-600">{token.scopes.join(", ")}</td>
                      <td className="px-3 py-3 text-[12px] text-zinc-600">{formatDate(token.lastUsedAt)}</td>
                      <td className="px-3 py-3 text-[12px] text-zinc-600">{token.expiresAt ? formatDate(token.expiresAt) : "nigdy"}</td>
                      <td className="px-3 py-3">
                        <span className={`${ui.badge} ${state.className}`}>{state.label}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!token.revokedAt && (
                          <button type="button" onClick={() => void handleRevoke(token)} className="text-[12px] font-medium text-zinc-500 hover:text-red-600">
                            Cofnij
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
