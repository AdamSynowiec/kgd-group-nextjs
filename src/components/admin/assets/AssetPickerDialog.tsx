"use client";

import { useEffect } from "react";
import type { AssetItem, Session } from "@/lib/adminApi";
import { CloseIcon } from "../icons";
import { ui } from "../ui";
import AssetLibrary, { type AssetAccept } from "./AssetLibrary";

/** "Wybierz z biblioteki" przy polach zdjęć i plików — ta sama biblioteka co zakładka "Assets", w trybie wyboru. */
export default function AssetPickerDialog({
  session,
  accept,
  multiple = false,
  onPick,
  onClose,
}: {
  session: Session | null;
  accept?: AssetAccept;
  /** Kilka plików naraz — onPick dostaje je wszystkie (w kolejności z biblioteki). */
  multiple?: boolean;
  onPick: (assets: AssetItem[]) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/40 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wybierz plik z biblioteki"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-[min(820px,100%)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-900/10"
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-zinc-900">Wybierz z biblioteki</div>
            <div className="text-[12px] text-zinc-500">
              {accept === "image" ? "Zdjęcia" : accept === "pdf" ? "Pliki PDF" : "Pliki"} ·{" "}
              {multiple ? "zaznacz kilka i kliknij „Wybierz zaznaczone”." : "kliknij, a potem „Wybierz ten plik” (albo dwuklik)."} Można też wgrać nowe.
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij" className={ui.iconBtn}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 p-3">
          <AssetLibrary
            session={session}
            mode="pick"
            accept={accept}
            multiple={multiple}
            onPick={(asset) => {
              onPick([asset]);
              onClose();
            }}
            onPickMany={(assets) => {
              onPick(assets);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
