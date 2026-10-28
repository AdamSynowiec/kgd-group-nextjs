"use client";

import { useEffect, useState } from "react";
import { fetchSiteFiles, saveSiteFile, type SiteFileRecord, type Session } from "@/lib/adminApi";
import { SITE_FILES, type SiteFileName } from "@/lib/siteFiles";
import { ui } from "./ui";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/**
 * Ustawienia → Pliki serwisu: pliki z rejestru (src/lib/siteFiles.ts / backend SiteFiles.php), np. robots.txt.
 * Bez własnej treści build generuje plik domyślny — edytor pokazuje go jako punkt wyjścia.
 * Zmiana trafia na stronę przy najbliższej publikacji.
 */
export default function SiteFilesPanel({ session }: { session: Session | null }) {
  const [files, setFiles] = useState<SiteFileRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSiteFiles(session)
      .then((result) => !cancelled && setFiles(result.files))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Nie udało się wczytać plików."));
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (error) return <div className={ui.alertError}>{error}</div>;
  if (files === null) return <div className="h-72 animate-pulse rounded-xl bg-zinc-200/50" />;

  return (
    <div className="space-y-6">
      {files
        .filter((file): file is SiteFileRecord & { name: SiteFileName } => file.name in SITE_FILES)
        .map((file) => (
          <SiteFileEditor
            key={file.name}
            file={file}
            session={session}
            onSaved={(saved) => setFiles((prev) => (prev ?? []).map((item) => (item.name === saved.name ? saved : item)))}
          />
        ))}
    </div>
  );
}

function SiteFileEditor({
  file,
  session,
  onSaved,
}: {
  file: SiteFileRecord & { name: SiteFileName };
  session: Session | null;
  onSaved: (file: SiteFileRecord) => void;
}) {
  const definition = SITE_FILES[file.name];
  const defaultContent = definition.defaultContent(window.location.origin);
  const [draft, setDraft] = useState(file.content ?? defaultContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isCustom = file.content !== null;
  const dirty = draft !== (file.content ?? defaultContent);

  async function save(content: string) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveSiteFile(file.name, content, session);
      onSaved(result);
      setDraft(result.content ?? defaultContent);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać pliku.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <code className="font-mono">/{file.name}</code>
            <span className={`${ui.badge} ${isCustom ? ui.badgeSuccess : ui.badgeNeutral}`}>{isCustom ? "Własny" : "Domyślny"}</span>
          </div>
          <p className="text-xs text-zinc-500">{definition.description}</p>
        </div>
        <a href={`/${file.name}`} target="_blank" rel="noreferrer" className={ui.btnSecondarySm}>
          Obecna wersja
        </a>
      </div>

      <div className="space-y-3 px-5 py-4">
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          spellCheck={false}
          rows={14}
          aria-label={`Treść pliku ${file.name}`}
          className={`${ui.input} resize-y font-mono text-[13px] leading-relaxed`}
        />
        <p className={ui.hint}>
          {isCustom ? `Zmieniono ${formatDate(file.updatedAt)}${file.updatedBy ? ` — ${file.updatedBy}` : ""}. ` : "Plik generowany automatycznie — zapisz, żeby użyć własnej treści. "}
          Zmiany będą widoczne na stronie po najbliższej publikacji.
        </p>
        {error && <div className={ui.alertError}>{error}</div>}
        {saved && !dirty && <div className={ui.alertSuccess}>Zapisano. Opublikuj stronę, żeby zmiana trafiła do /{file.name}.</div>}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {isCustom && (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm(`Przywrócić domyślny ${file.name}? Własna treść zostanie usunięta.`) && void save("")}
              className={ui.btnGhost}
            >
              Przywróć domyślny
            </button>
          )}
          <button type="button" disabled={busy || (!dirty && isCustom)} onClick={() => void save(draft)} className={ui.btnPrimary}>
            {busy ? "Zapisywanie…" : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}
