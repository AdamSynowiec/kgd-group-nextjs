"use client";

import { useState } from "react";
import { uploadAsset, type Session } from "@/lib/adminApi";
import { isSafeUrl } from "@/lib/richText/sanitizeHtml";
import type { ImageWidth } from "@/lib/richText/commands";

const buttonClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white";
const inputClass = "w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none";

type WidthMode = "auto" | "percent" | "px";

/** "50%"/"600px"/null -> tryb + liczba do wstępnego wypełnienia kontrolek przy edycji istniejącego obrazka. */
function parseWidth(width: ImageWidth): { mode: WidthMode; value: string } {
  if (!width) return { mode: "auto", value: "100" };
  const match = /^(\d+(?:\.\d+)?)(px|%)$/.exec(width);
  if (!match) return { mode: "auto", value: "100" };
  return { mode: match[2] === "%" ? "percent" : "px", value: match[1] };
}

/**
 * Panel wstawiania/edycji zdjęcia — reużywa ISTNIEJĄCY mechanizm przesyłania
 * plików (uploadAsset() z src/lib/adminApi.ts, ten sam co AssetEditor.tsx dla
 * pól type:"asset") zamiast wymagać wyłącznie zewnętrznego URL-a; pole
 * "adres" zostaje jako świadomy fallback, tak jak w AssetEditor. Tekst
 * alternatywny jest WYMAGANY — dostępność i SEO, patrz wymagania zadania.
 *
 * Ten sam komponent obsługuje DWA tryby (patrz RichTextEditor.tsx):
 * wstawianie nowego obrazka (initial* puste) i edycję już wstawionego
 * (kliknięcie obrazka w edytorze — initial* wypełnione jego bieżącymi
 * wartościami, w tym szerokością).
 */
export default function ImagePopover({
  session,
  initialUrl = "",
  initialAlt = "",
  initialWidth = null,
  isEditing = false,
  canMoveUp = false,
  canMoveDown = false,
  onMove,
  onConfirm,
  onCancel,
}: {
  session: Session | null;
  initialUrl?: string;
  initialAlt?: string;
  initialWidth?: ImageWidth;
  isEditing?: boolean;
  /** Tylko gdy isEditing — czy jest sąsiedni blok, do którego da się przenieść obrazek (patrz commands.ts::canMoveImage). */
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  /** Przenosi NATYCHMIAST (nie czeka na "Zapisz zdjęcie") — patrz RichTextEditor.tsx::handleImageMove. */
  onMove?: (direction: "up" | "down") => void;
  onConfirm: (src: string, alt: string, width: ImageWidth) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [alt, setAlt] = useState(initialAlt);
  const initialParsedWidth = parseWidth(initialWidth);
  const [widthMode, setWidthMode] = useState<WidthMode>(initialParsedWidth.mode);
  const [widthValue, setWidthValue] = useState(initialParsedWidth.value);
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

    let width: ImageWidth = null;
    if (widthMode !== "auto") {
      const num = Number(widthValue.replace(",", "."));
      if (!Number.isFinite(num) || num <= 0) {
        setError("Podaj poprawną szerokość — liczbę większą od 0.");
        return;
      }
      width = widthMode === "percent" ? `${num}%` : `${Math.round(num)}px`;
    }

    onConfirm(trimmedUrl, trimmedAlt, width);
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

      <div className="mt-2">
        <label className="mb-1 block text-xs font-medium text-zinc-600">Szerokość</label>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={widthMode}
            onChange={(event) => {
              setWidthMode(event.target.value as WidthMode);
              setError("");
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
          >
            <option value="auto">Automatyczna (oryginalny rozmiar)</option>
            <option value="percent">Procent szerokości tekstu</option>
            <option value="px">Piksele</option>
          </select>

          {widthMode !== "auto" && (
            <>
              <input
                type="number"
                min="1"
                step="1"
                value={widthValue}
                onChange={(event) => {
                  setWidthValue(event.target.value);
                  setError("");
                }}
                aria-label="Wartość szerokości"
                className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
              />
              <span className="text-xs text-zinc-500">{widthMode === "percent" ? "%" : "px"}</span>
            </>
          )}

          {widthMode === "percent" && widthValue !== "100" && (
            <button type="button" onClick={() => setWidthValue("100")} className="text-xs text-zinc-500 underline hover:text-zinc-700">
              Ustaw 100%
            </button>
          )}
        </div>
      </div>

      {isEditing && onMove && (
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-zinc-600">Pozycja w tekście</label>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => onMove("up")} disabled={!canMoveUp} className={buttonClass}>
              ↑ Przenieś wyżej
            </button>
            <button type="button" onClick={() => onMove("down")} disabled={!canMoveDown} className={buttonClass}>
              ↓ Przenieś niżej
            </button>
          </div>
        </div>
      )}

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
          {isEditing ? "Zapisz zdjęcie" : "Wstaw zdjęcie"}
        </button>
        <button type="button" onClick={onCancel} className={buttonClass}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
