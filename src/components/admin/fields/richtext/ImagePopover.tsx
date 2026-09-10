"use client";

import { useState } from "react";
import { uploadAsset, type Session } from "@/lib/adminApi";
import { isSafeUrl } from "@/lib/richText/sanitizeHtml";

const buttonClass = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50";
const inputClass = "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

/**
 * Panel wstawiania zdjęcia — reużywa ISTNIEJĄCY mechanizm przesyłania plików
 * (uploadAsset() z src/lib/adminApi.ts, ten sam co AssetEditor.tsx dla pól
 * type:"asset") zamiast wymagać wyłącznie zewnętrznego URL-a; pole "adres"
 * zostaje jako świadomy fallback, tak jak w AssetEditor. Tekst alternatywny
 * jest WYMAGANY — dostępność i SEO, patrz wymagania zadania.
 */
export default function ImagePopover({
  session,
  onConfirm,
  onCancel,
}: {
  session: Session | null;
  onConfirm: (src: string, alt: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadAsset(file, session);
      setUrl(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesłać pliku.");
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    const trimmedUrl = url.trim();
    const trimmedAlt = alt.trim();

    if (trimmedUrl === "" || !isSafeUrl(trimmedUrl)) {
      setError("Wybierz plik albo podaj poprawny adres zdjęcia.");
      return;
    }
    if (trimmedAlt === "") {
      setError("Tekst alternatywny jest wymagany — opisz, co przedstawia zdjęcie.");
      return;
    }

    onConfirm(trimmedUrl, trimmedAlt);
  }

  return (
    <div className="border-b border-zinc-200 bg-blue-50 px-3 py-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="richtext-image-url" className="mb-1 block text-xs font-medium text-zinc-600">
            Adres zdjęcia
          </label>
          <input
            id="richtext-image-url"
            type="text"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError("");
            }}
            placeholder="https://… albo wybierz plik obok"
            autoFocus
            className={inputClass}
          />
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50">
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

        {url && isSafeUrl(url) && (
          // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina, nie treść strony
          <img src={url} alt="" className="h-16 w-16 shrink-0 rounded border border-zinc-200 object-cover" />
        )}
      </div>

      <div className="mt-2">
        <label htmlFor="richtext-image-alt" className="mb-1 block text-xs font-medium text-zinc-600">
          Tekst alternatywny (wymagany)
        </label>
        <input
          id="richtext-image-alt"
          type="text"
          value={alt}
          onChange={(event) => {
            setAlt(event.target.value);
            setError("");
          }}
          placeholder="Opisz, co przedstawia zdjęcie"
          aria-invalid={error !== ""}
          aria-describedby={error !== "" ? "richtext-image-error" : undefined}
          className={inputClass}
        />
      </div>

      {error && (
        <p id="richtext-image-error" role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleConfirm}
          className={`${buttonClass} border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800`}
        >
          Wstaw zdjęcie
        </button>
        <button type="button" onClick={onCancel} className={buttonClass}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
