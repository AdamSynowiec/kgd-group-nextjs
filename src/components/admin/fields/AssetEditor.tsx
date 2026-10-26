"use client";

import { useState } from "react";
import { uploadAsset } from "@/lib/adminApi";
import LibraryButton from "../assets/LibraryButton";
import { inputClass, type FieldEditorProps } from "./types";

/**
 * Edytor dla type:"asset" — podgląd + wybór pliku z dysku. Plik leci na
 * serwer (UploadController.php, patrz backend/), a do pola trafia sam URL,
 * który wraca — dokładnie tak samo, jakby ktoś wkleił tam gotową ścieżkę
 * ręcznie (stąd input tekstowy obok zostaje jako awaryjne wyjście). Bez URL-a
 * plik nie renderuje się nigdzie na stronie — sama zawartość binarna nigdy
 * nie trafia do treści strony (bazy). Projekt nie ma osobnej biblioteki
 * mediów — to właśnie plik-na-dysku + URL-string JEST tutejszym systemem
 * assetów, "asset" tylko nazywa go jawnie zamiast zgadywać po rozszerzeniu.
 *
 * Plik można też upuścić na podgląd (przeciągnij i upuść).
 */
export default function AssetEditor({ label, value, path, session, onChange }: FieldEditorProps) {
  const url = typeof value === "string" ? value : "";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadAsset(file, session);
      onChange(path, uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesłać pliku.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-w-[16rem] items-start gap-3">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file && !uploading) void handleFile(file);
        }}
        title="Kliknij albo upuść plik"
        className={`group relative grid h-[72px] w-[72px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border transition ${
          dragOver ? "border-indigo-400 bg-indigo-50 ring-4 ring-indigo-500/10" : url ? "border-zinc-200 bg-zinc-50" : "border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina, nie treść strony
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-zinc-400" aria-hidden>
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m4 17 4.5-4.5 3 3 3.5-3.5 5 5" strokeLinejoin="round" />
          </svg>
        )}
        <span className={`absolute inset-0 grid place-items-center bg-zinc-950/55 text-[11px] font-medium text-white transition ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : url ? "Zmień" : "Dodaj"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </label>

      <div className="min-w-0 flex-1 space-y-1.5">
        <input
          aria-label={label}
          type="text"
          value={url}
          onChange={(event) => onChange(path, event.target.value)}
          className={`${inputClass} font-mono text-[12px]`}
          placeholder="/investments/.../plik.webp"
        />
        <div className="flex items-center justify-between gap-2">
          {(uploading || !url) && <p className="text-[11px] text-zinc-400">{uploading ? "Przesyłanie…" : "Kliknij podgląd albo upuść na nim plik."}</p>}
          <LibraryButton session={session} accept="image" onPick={(picked) => onChange(path, picked)} className="ml-auto" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
