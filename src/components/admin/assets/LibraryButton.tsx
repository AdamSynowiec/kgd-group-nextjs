"use client";

import { useState } from "react";
import type { Session } from "@/lib/adminApi";
import { can } from "@/lib/permissions";
import { FolderIcon } from "../icons";
import AssetPickerDialog from "./AssetPickerDialog";
import type { AssetAccept } from "./AssetLibrary";

/** "Z biblioteki" przy polu zdjęcia/pliku — wstawia adres pliku wybranego w bibliotece "Assets". Bez assets.list nic nie pokazuje. */
export default function LibraryButton({
  session,
  accept,
  onPick,
  className = "",
}: {
  session: Session | null;
  accept?: AssetAccept;
  onPick: (url: string) => void;
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
        <FolderIcon className="h-3.5 w-3.5" /> Z biblioteki
      </button>
      {open && <AssetPickerDialog session={session} accept={accept} onPick={(asset) => onPick(asset.url)} onClose={() => setOpen(false)} />}
    </>
  );
}
