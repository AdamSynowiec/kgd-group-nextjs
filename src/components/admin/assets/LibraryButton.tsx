"use client";

import { useState } from "react";
import type { Session } from "@/lib/adminApi";
import { can } from "@/lib/permissions";
import { FolderIcon } from "../icons";
import AssetPickerDialog from "./AssetPickerDialog";
import type { AssetAccept } from "./AssetLibrary";

/**
 * "Z biblioteki" przy polu zdjęcia/pliku — wstawia adres pliku wybranego w bibliotece "Assets"
 * (z onPickMany — kilka plików naraz, np. do galerii). Bez assets.list nic nie pokazuje.
 */
export default function LibraryButton({
  session,
  accept,
  onPick,
  onPickMany,
  label,
  className = "",
}: {
  session: Session | null;
  accept?: AssetAccept;
  onPick?: (url: string) => void;
  onPickMany?: (urls: string[]) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!can(session?.permissions, "assets.list")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 transition hover:text-indigo-700 ${className}`}
      >
        <FolderIcon className="h-3.5 w-3.5" /> {label ?? (onPickMany ? "Dodaj kilka z biblioteki" : "Z biblioteki")}
      </button>
      {open && (
        <AssetPickerDialog
          session={session}
          accept={accept}
          multiple={onPickMany !== undefined}
          onPick={(assets) => (onPickMany ? onPickMany(assets.map((asset) => asset.url)) : assets[0] && onPick?.(assets[0].url))}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
