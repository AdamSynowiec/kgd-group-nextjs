"use client";

import { useState } from "react";
import { uploadAsset } from "@/lib/adminApi";
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
 */
export default function AssetEditor({ label, value, path, session, onChange }: FieldEditorProps) {
  const url = typeof value === "string" ? value : "";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex items-start gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina, nie treść strony
        <img src={url} alt="" className="h-16 w-16 flex-shrink-0 rounded border border-zinc-200 object-cover" />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 text-center text-[10px] text-zinc-400">
          Brak zdjęcia
        </div>
      )}

      <div className="flex-1 space-y-2">
        <input
          aria-label={label}
          type="text"
          value={url}
          onChange={(event) => onChange(path, event.target.value)}
          className={inputClass}
          placeholder="/investments/.../plik.webp"
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50">
          {uploading ? "Przesyłanie…" : "Wybierz plik…"}
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
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
