"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import {
  createAssetFolder,
  deleteAsset,
  deleteAssetFolder,
  fetchAssets,
  fetchAssetUsage,
  moveAssets,
  renameAsset,
  updateAssetFolder,
  uploadAsset,
  type AssetFolder,
  type AssetItem,
  type Session,
} from "@/lib/adminApi";
import { can } from "@/lib/permissions";
import { CheckIcon, ChevronRightIcon, CloseIcon, ExternalIcon, FolderIcon, PlusIcon, SearchIcon, TrashIcon } from "../icons";
import { ui } from "../ui";

export type AssetAccept = "image" | "pdf";

const ASSET_DRAG = "application/x-kgd-assets";
const FOLDER_DRAG = "application/x-kgd-folder";

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
const isImage = (asset: AssetItem) => (asset.mime ?? "").startsWith("image/") || /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(asset.filename);
const isPdf = (asset: AssetItem) => asset.mime === "application/pdf" || /\.pdf$/i.test(asset.filename);
const extension = (asset: AssetItem) => asset.filename.split(".").pop()?.toUpperCase() ?? "";
const matchesAccept = (asset: AssetItem, accept?: AssetAccept) => !accept || (accept === "image" ? isImage(asset) : isPdf(asset));

/**
 * Biblioteka plików ("Assets") — zakładka panelu (mode "manage") i okno wyboru pliku do pola (mode "pick").
 * Katalogi są tylko porządkiem w bazie (AssetController.php): przeniesienie pliku czy katalogu nie zmienia
 * adresu pliku, więc strony, które go używają, działają dalej.
 *
 * Przeciąganie: pliki i katalogi na katalog (w drzewie albo w siatce) — przeniesienie; pliki z dysku na siatkę — wgranie
 * do otwartego katalogu. Klik — zaznaczenie, Ctrl/⌘ — dodaj do zaznaczenia, Shift — zakres.
 */
export default function AssetLibrary({
  session,
  mode = "manage",
  accept,
  onPick,
}: {
  session: Session | null;
  mode?: "manage" | "pick";
  accept?: AssetAccept;
  onPick?: (asset: AssetItem) => void;
}) {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; done: boolean; error?: string }[]>([]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const canManage = can(session?.permissions, "assets.manage");
  const canDelete = can(session?.permissions, "assets.delete");
  const canUpload = can(session?.permissions, "assets.upload");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAssets(current, search, session);
      setFolders(result.folders);
      setAssets(result.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się wczytać plików.");
    } finally {
      setLoading(false);
    }
  }, [current, search, session]);

  useEffect(() => {
    void load();
  }, [load]);

  // Wyszukiwanie z małym opóźnieniem — nie przy każdym znaku.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const byParent = useMemo(() => {
    const map = new Map<number | null, AssetFolder[]>();
    for (const folder of folders) map.set(folder.parentId, [...(map.get(folder.parentId) ?? []), folder]);
    return map;
  }, [folders]);

  const pathTo = (id: number | null): AssetFolder[] => {
    const chain: AssetFolder[] = [];
    let node = folders.find((folder) => folder.id === id);
    while (node && chain.length < 50) {
      chain.unshift(node);
      const parentId: number | null = node.parentId;
      node = folders.find((folder) => folder.id === parentId);
    }
    return chain;
  };

  const visible = assets.filter((asset) => matchesAccept(asset, accept));
  const subfolders = search ? [] : (byParent.get(current) ?? []);
  const selectedAssets = visible.filter((asset) => selected.has(asset.id));
  const detail = selectedAssets.length === 1 ? selectedAssets[0] : null;

  function open(folderId: number | null) {
    setCurrent(folderId);
    setQuery("");
    setSearch("");
    setSelected(new Set());
    for (const folder of pathTo(folderId)) setExpanded((prev) => new Set(prev).add(folder.id));
  }

  function clickAsset(asset: AssetItem, event: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) {
    if (mode === "pick") {
      setSelected(new Set([asset.id]));
      return;
    }
    if (event.shiftKey && lastClicked !== null) {
      const from = visible.findIndex((item) => item.id === lastClicked);
      const to = visible.findIndex((item) => item.id === asset.id);
      const [start, end] = from < to ? [from, to] : [to, from];
      setSelected(new Set(visible.slice(start, end + 1).map((item) => item.id)));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(asset.id)) next.delete(asset.id);
        else next.add(asset.id);
        return next;
      });
    } else {
      setSelected(new Set([asset.id]));
    }
    setLastClicked(asset.id);
  }

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operacja się nie powiodła.");
    }
    await load();
  }

  async function upload(files: File[]) {
    if (!canUpload || files.length === 0) return;
    setUploads(files.map((file) => ({ name: file.name, done: false })));
    for (const [index, file] of files.entries()) {
      try {
        await uploadAsset(file, session, current);
        setUploads((prev) => prev.map((item, i) => (i === index ? { ...item, done: true } : item)));
      } catch (err) {
        setUploads((prev) => prev.map((item, i) => (i === index ? { ...item, done: true, error: err instanceof Error ? err.message : "Błąd" } : item)));
      }
    }
    await load();
    setTimeout(() => setUploads((prev) => prev.filter((item) => item.error)), 2500);
  }

  async function removeAssets(items: AssetItem[]) {
    if (items.length === 0) return;
    const usage = await Promise.all(items.map((item) => fetchAssetUsage(item.id, session).then((result) => result.pages).catch(() => [] as string[])));
    const used = items.map((item, index) => ({ item, pages: usage[index] })).filter((entry) => entry.pages.length > 0);
    const message = used.length
      ? `UWAGA — ${used.length === 1 ? "ten plik jest używany" : `${used.length} z tych plików są używane`} na stronach:\n\n${used
          .map((entry) => `• ${entry.item.name}: ${entry.pages.join(", ")}`)
          .join("\n")}\n\nPo usunięciu te miejsca pokażą brakujący plik. Usunąć mimo to?`
      : `Usunąć ${items.length === 1 ? `„${items[0].name}”` : `${items.length} plików`} z serwera? Tego nie da się cofnąć.`;
    if (!window.confirm(message)) return;
    await run(async () => {
      for (const item of items) await deleteAsset(item.id, true, session);
      setSelected(new Set());
    });
  }

  async function createFolder(name: string) {
    setCreating(false);
    if (!name.trim()) return;
    await run(async () => {
      const result = await createAssetFolder(name.trim(), current, session);
      setFolders(result.folders);
    });
  }

  // --- Przeciąganie ---------------------------------------------------------------

  function dragAssets(event: DragEvent, asset: AssetItem) {
    const ids = selected.has(asset.id) ? [...selected] : [asset.id];
    event.dataTransfer.setData(ASSET_DRAG, JSON.stringify(ids));
    event.dataTransfer.effectAllowed = "move";
  }

  function dropProps(key: string, folderId: number | null) {
    return {
      onDragOver: (event: DragEvent) => {
        const types = event.dataTransfer.types;
        if (!canManage || (!types.includes(ASSET_DRAG) && !types.includes(FOLDER_DRAG))) return;
        event.preventDefault();
        event.stopPropagation();
        setDropTarget(key);
      },
      onDragLeave: () => setDropTarget((prev) => (prev === key ? null : prev)),
      onDrop: (event: DragEvent) => {
        setDropTarget(null);
        const assetIds = event.dataTransfer.getData(ASSET_DRAG);
        const folderDrag = event.dataTransfer.getData(FOLDER_DRAG);
        if (!assetIds && !folderDrag) return;
        event.preventDefault();
        event.stopPropagation();
        if (assetIds) {
          void run(async () => {
            await moveAssets(JSON.parse(assetIds) as number[], folderId, session);
            setSelected(new Set());
          });
        } else if (Number(folderDrag) !== folderId) {
          void run(() => updateAssetFolder(Number(folderDrag), { parentId: folderId }, session));
        }
      },
    };
  }

  const gridDrop = {
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes("Files") || !canUpload) return;
      event.preventDefault();
      setDropTarget("grid");
    },
    onDragLeave: (event: DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget((prev) => (prev === "grid" ? null : prev));
    },
    onDrop: (event: DragEvent) => {
      if (!event.dataTransfer.files.length) return;
      event.preventDefault();
      setDropTarget(null);
      void upload([...event.dataTransfer.files]);
    },
  };

  // --- Widok ---------------------------------------------------------------------

  const breadcrumbs = pathTo(current);
  const flatFolders = (parentId: number | null, depth = 0): { folder: AssetFolder; depth: number }[] =>
    (byParent.get(parentId) ?? []).flatMap((folder) => [{ folder, depth }, ...flatFolders(folder.id, depth + 1)]);

  return (
    <div className={`grid min-h-0 overflow-hidden rounded-xl border border-zinc-200 bg-white ${mode === "pick" ? "h-full" : "min-h-[640px]"} md:grid-cols-[240px_minmax(0,1fr)]`}>
      {/* ── Drzewo katalogów ── */}
      <nav aria-label="Katalogi" className="flex min-h-0 flex-col border-b border-zinc-200 bg-zinc-50/70 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-3 pb-1 pt-3">
          <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Katalogi</span>
          {canManage && (
            <button type="button" onClick={() => setCreating(true)} className={ui.iconBtn} title="Nowy katalog w otwartym miejscu">
              <PlusIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="max-h-56 min-h-0 flex-1 overflow-y-auto px-2 pb-3 md:max-h-none">
          <TreeRow
            label="Wszystkie pliki"
            depth={0}
            active={current === null && !search}
            dropActive={dropTarget === "tree:root"}
            onClick={() => open(null)}
            {...dropProps("tree:root", null)}
          />
          {(byParent.get(null) ?? []).map((folder) => (
            <FolderBranch
              key={folder.id}
              folder={folder}
              depth={1}
              byParent={byParent}
              current={search ? undefined : current}
              expanded={expanded}
              dropTarget={dropTarget}
              canManage={canManage}
              onToggle={(id) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onOpen={open}
              dropProps={dropProps}
              onRename={(id, name) => void run(() => updateAssetFolder(id, { name }, session))}
              onDelete={(target) => {
                if (window.confirm(`Usunąć katalog „${target.name}”?\n\nJego pliki i podkatalogi trafią piętro wyżej — żaden plik nie zostanie usunięty.`)) {
                  if (current === target.id) setCurrent(target.parentId);
                  void run(() => deleteAssetFolder(target.id, session));
                }
              }}
            />
          ))}
          {creating && <NewFolderInput onDone={(name) => void createFolder(name)} depth={breadcrumbs.length + 1} />}
        </div>
      </nav>

      {/* ── Zawartość katalogu ── */}
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-sm">
            {search ? (
              <span className="font-medium text-zinc-800">Wyniki wyszukiwania „{search}”</span>
            ) : (
              <>
                <button type="button" onClick={() => open(null)} className="rounded px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" {...dropProps("crumb:root", null)}>
                  Wszystkie pliki
                </button>
                {breadcrumbs.map((folder) => (
                  <span key={folder.id} className="flex min-w-0 items-center gap-1">
                    <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-zinc-300" />
                    <button type="button" onClick={() => open(folder.id)} className="truncate rounded px-1.5 py-0.5 font-medium text-zinc-800 hover:bg-zinc-100" {...dropProps(`crumb:${folder.id}`, folder.id)}>
                      {folder.name}
                    </button>
                  </span>
                ))}
              </>
            )}
          </div>
          <label className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj we wszystkich…" aria-label="Szukaj plików" className={`${ui.input} w-52 py-1.5 pl-8 text-[13px]`} />
          </label>
          {canManage && !search && (
            <button type="button" onClick={() => setCreating(true)} className={ui.btnSecondarySm}>
              <FolderIcon className="h-3.5 w-3.5" /> Nowy katalog
            </button>
          )}
          {canUpload && (
            <>
              <button type="button" onClick={() => fileInput.current?.click()} className={ui.btnPrimarySm}>
                <PlusIcon className="h-3.5 w-3.5" /> Wgraj pliki
              </button>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={accept === "image" ? "image/*" : accept === "pdf" ? "application/pdf" : "image/*,application/pdf"}
                className="hidden"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])];
                  event.target.value = "";
                  void upload(files);
                }}
              />
            </>
          )}
        </div>

        {mode === "manage" && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-indigo-100 bg-indigo-50/60 px-4 py-2 text-sm">
            <span className="font-medium text-zinc-700">Zaznaczono: {selected.size}</span>
            {canManage && (
              <select
                value=""
                onChange={(event) => {
                  const target = event.target.value === "root" ? null : Number(event.target.value);
                  void run(async () => {
                    await moveAssets([...selected], target, session);
                    setSelected(new Set());
                  });
                }}
                className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
                aria-label="Przenieś zaznaczone do katalogu"
              >
                <option value="">Przenieś do…</option>
                <option value="root">Wszystkie pliki (najwyższy poziom)</option>
                {flatFolders(null).map(({ folder, depth }) => (
                  <option key={folder.id} value={folder.id}>
                    {"  ".repeat(depth)}
                    {folder.name}
                  </option>
                ))}
              </select>
            )}
            {canDelete && (
              <button type="button" onClick={() => void removeAssets(selectedAssets)} className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                Usuń zaznaczone
              </button>
            )}
            <button type="button" onClick={() => setSelected(new Set(visible.map((asset) => asset.id)))} className="text-xs text-zinc-500 hover:text-zinc-800">
              Zaznacz wszystkie
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-xs text-zinc-500 hover:text-zinc-800">
              Odznacz
            </button>
          </div>
        )}

        {error && <div className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-inset ring-red-600/15">{error}</div>}
        {uploads.length > 0 && (
          <div className="mx-4 mt-3 flex flex-wrap gap-1.5">
            {uploads.map((item, index) => (
              <span key={index} className={`${ui.badge} ${item.error ? "bg-red-50 text-red-700 ring-red-600/15" : item.done ? ui.badgeSuccess : ui.badgeNeutral}`} title={item.error}>
                {item.done ? (item.error ? "✕" : <CheckIcon className="h-3 w-3" />) : <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />}
                {item.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div
            {...gridDrop}
            onClick={(event) => event.target === event.currentTarget && setSelected(new Set())}
            className={`relative min-h-0 flex-1 overflow-y-auto p-4 ${dropTarget === "grid" ? "bg-indigo-50/60 ring-2 ring-inset ring-indigo-300" : ""}`}
          >
            {dropTarget === "grid" && <div className="pointer-events-none absolute inset-x-4 top-4 rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white shadow">Upuść, aby wgrać do: {breadcrumbs.at(-1)?.name ?? "Wszystkie pliki"}</div>}

            {loading && assets.length === 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="aspect-[4/5] animate-pulse rounded-lg bg-zinc-100" />
                ))}
              </div>
            ) : subfolders.length === 0 && visible.length === 0 ? (
              <div className="grid h-full min-h-[240px] place-items-center text-center">
                <div>
                  <FolderIcon className="mx-auto h-10 w-10 text-zinc-300" />
                  <p className="mt-2 text-sm text-zinc-500">{search ? "Nic nie znaleziono." : "Pusty katalog."}</p>
                  {canUpload && !search && <p className="mt-1 text-xs text-zinc-400">Przeciągnij tu pliki z dysku albo użyj „Wgraj pliki”.</p>}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
                {subfolders.map((folder) => (
                  <button
                    key={`f${folder.id}`}
                    type="button"
                    draggable={canManage}
                    onDragStart={(event) => event.dataTransfer.setData(FOLDER_DRAG, String(folder.id))}
                    onDoubleClick={() => open(folder.id)}
                    onClick={() => open(folder.id)}
                    {...dropProps(`tile:${folder.id}`, folder.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-center transition ${
                      dropTarget === `tile:${folder.id}` ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200" : "border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 hover:bg-white"
                    }`}
                  >
                    <FolderIcon className="h-10 w-10 text-amber-400" />
                    <span className="w-full truncate text-[13px] font-medium text-zinc-800">{folder.name}</span>
                    <span className="text-[11px] text-zinc-400">{folder.count} plików</span>
                  </button>
                ))}
                {visible.map((asset) => {
                  const isSelected = selected.has(asset.id);
                  return (
                    <div
                      key={asset.id}
                      role="button"
                      tabIndex={0}
                      draggable={canManage && mode === "manage"}
                      onDragStart={(event) => dragAssets(event, asset)}
                      onClick={(event) => clickAsset(asset, event)}
                      onDoubleClick={() => mode === "pick" && onPick?.(asset)}
                      onKeyDown={(event) => event.key === "Enter" && (mode === "pick" ? onPick?.(asset) : clickAsset(asset, event))}
                      className={`group relative cursor-pointer overflow-hidden rounded-lg border bg-white text-left transition ${
                        isSelected ? "border-indigo-500 ring-2 ring-indigo-200" : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="grid aspect-[4/3] place-items-center overflow-hidden bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
                        {isImage(asset) ? (
                          // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina
                          <img src={asset.url} alt="" loading="lazy" className="h-full w-full object-contain" />
                        ) : (
                          <span className={`grid h-12 w-12 place-items-center rounded-lg text-[11px] font-bold ring-1 ring-inset ${isPdf(asset) ? "bg-red-50 text-red-600 ring-red-600/15" : "bg-zinc-100 text-zinc-500 ring-zinc-500/10"}`}>
                            {extension(asset)}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-zinc-100 px-2.5 py-2">
                        <div className="truncate text-[12px] font-medium text-zinc-800" title={asset.name}>
                          {asset.name}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {formatSize(asset.size)}
                          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                        </div>
                      </div>
                      <span
                        className={`absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-md border transition ${
                          isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 bg-white/90 text-transparent opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {detail && (
            <AssetDetail
              key={detail.id}
              asset={detail}
              folderName={pathTo(detail.folderId).map((folder) => folder.name).join(" / ") || "Wszystkie pliki"}
              session={session}
              mode={mode}
              canManage={canManage}
              canDelete={canDelete}
              onRename={(name) => void run(() => renameAsset(detail.id, name, session))}
              onDelete={() => void removeAssets([detail])}
              onPick={() => onPick?.(detail)}
              onClose={() => setSelected(new Set())}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  label,
  depth,
  active,
  dropActive,
  onClick,
  toggle,
  actions,
  ...rest
}: {
  label: ReactNode;
  depth: number;
  active: boolean;
  dropActive: boolean;
  onClick: () => void;
  toggle?: ReactNode;
  actions?: ReactNode;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent) => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
}) {
  return (
    <div
      {...rest}
      className={`group flex items-center gap-1 rounded-lg py-1 pr-1 text-[13px] transition ${
        dropActive ? "bg-indigo-100 ring-2 ring-indigo-300" : active ? "bg-white font-medium text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200" : "text-zinc-600 hover:bg-zinc-200/50"
      }`}
      style={{ paddingLeft: `${4 + depth * 12}px` }}
    >
      <span className="grid w-4 shrink-0 place-items-center">{toggle}</span>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <FolderIcon className={`h-4 w-4 shrink-0 ${active ? "text-amber-500" : "text-amber-400"}`} />
        <span className="truncate">{label}</span>
      </button>
      {actions}
    </div>
  );
}

function FolderBranch({
  folder,
  depth,
  byParent,
  current,
  expanded,
  dropTarget,
  canManage,
  onToggle,
  onOpen,
  dropProps,
  onRename,
  onDelete,
}: {
  folder: AssetFolder;
  depth: number;
  byParent: Map<number | null, AssetFolder[]>;
  current: number | null | undefined;
  expanded: Set<number>;
  dropTarget: string | null;
  canManage: boolean;
  onToggle: (id: number) => void;
  onOpen: (id: number) => void;
  dropProps: (key: string, folderId: number | null) => { onDragOver: (event: DragEvent) => void; onDragLeave: () => void; onDrop: (event: DragEvent) => void };
  onRename: (id: number, name: string) => void;
  onDelete: (folder: AssetFolder) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const children = byParent.get(folder.id) ?? [];
  const isOpen = expanded.has(folder.id);

  return (
    <>
      {renaming ? (
        <NewFolderInput
          initial={folder.name}
          depth={depth}
          onDone={(name) => {
            setRenaming(false);
            if (name.trim() && name.trim() !== folder.name) onRename(folder.id, name.trim());
          }}
        />
      ) : (
        <TreeRow
          label={
            <>
              {folder.name}
              <span className="ml-1.5 text-[11px] font-normal text-zinc-400">{folder.count || ""}</span>
            </>
          }
          depth={depth}
          active={current === folder.id}
          dropActive={dropTarget === `tree:${folder.id}`}
          onClick={() => onOpen(folder.id)}
          draggable={canManage}
          onDragStart={(event) => event.dataTransfer.setData(FOLDER_DRAG, String(folder.id))}
          toggle={
            children.length > 0 ? (
              <button type="button" onClick={() => onToggle(folder.id)} aria-label={isOpen ? "Zwiń" : "Rozwiń"} className="text-zinc-400 hover:text-zinc-700">
                <ChevronRightIcon className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
            ) : null
          }
          actions={
            canManage ? (
              <span className="flex shrink-0 opacity-0 transition group-hover:opacity-100">
                <button type="button" onClick={() => setRenaming(true)} title="Zmień nazwę" className="rounded px-1 text-[11px] text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800">
                  Aa
                </button>
                <button type="button" onClick={() => onDelete(folder)} title="Usuń katalog (pliki zostają)" className="rounded px-1 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : null
          }
          {...dropProps(`tree:${folder.id}`, folder.id)}
        />
      )}
      {isOpen &&
        children.map((child) => (
          <FolderBranch
            key={child.id}
            folder={child}
            depth={depth + 1}
            byParent={byParent}
            current={current}
            expanded={expanded}
            dropTarget={dropTarget}
            canManage={canManage}
            onToggle={onToggle}
            onOpen={onOpen}
            dropProps={dropProps}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

function NewFolderInput({ initial = "", depth, onDone }: { initial?: string; depth: number; onDone: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const done = useRef(false);
  const finish = (value: string) => {
    if (done.current) return;
    done.current = true;
    onDone(value);
  };
  return (
    <div className="py-1 pr-1" style={{ paddingLeft: `${20 + depth * 12}px` }}>
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => finish(name)}
        onKeyDown={(event) => {
          if (event.key === "Enter") finish(name);
          if (event.key === "Escape") finish(initial);
        }}
        placeholder="Nazwa katalogu"
        className={`${ui.input} py-1 text-[13px]`}
      />
    </div>
  );
}

function AssetDetail({
  asset,
  folderName,
  session,
  mode,
  canManage,
  canDelete,
  onRename,
  onDelete,
  onPick,
  onClose,
}: {
  asset: AssetItem;
  folderName: string;
  session: Session | null;
  mode: "manage" | "pick";
  canManage: boolean;
  canDelete: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onPick: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(asset.name);
  const [usage, setUsage] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAssetUsage(asset.id, session)
      .then((result) => !cancelled && setUsage(result.pages))
      .catch(() => !cancelled && setUsage([]));
    return () => {
      cancelled = true;
    };
  }, [asset.id, session]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-zinc-50/50 lg:flex">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Szczegóły</span>
        <button type="button" onClick={onClose} className={ui.iconBtn} aria-label="Zamknij szczegóły">
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mx-4 grid aspect-[4/3] place-items-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {isImage(asset) ? (
          // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina
          <img src={asset.url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className={`grid h-16 w-16 place-items-center rounded-xl text-sm font-bold ${isPdf(asset) ? "bg-red-50 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>{extension(asset)}</span>
        )}
      </div>

      <div className="space-y-4 p-4">
        {mode === "pick" && (
          <button type="button" onClick={onPick} className={`${ui.btnPrimary} w-full`}>
            Wybierz ten plik
          </button>
        )}

        <label className="block">
          <span className={ui.label}>Nazwa</span>
          <input
            value={name}
            disabled={!canManage}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => name.trim() && name !== asset.name && onRename(name.trim())}
            onKeyDown={(event) => event.key === "Enter" && (event.target as HTMLInputElement).blur()}
            className={`${ui.input} py-1.5 text-[13px]`}
          />
        </label>

        <div>
          <span className={ui.label}>Adres</span>
          <div className="flex gap-1.5">
            <input readOnly value={asset.url} className={`${ui.input} py-1.5 font-mono text-[11px]`} onFocus={(event) => event.target.select()} />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(asset.url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className={ui.btnSecondarySm}
            >
              {copied ? "Skopiowano" : "Kopiuj"}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
          <dt className="text-zinc-500">Katalog</dt>
          <dd className="truncate text-zinc-800" title={folderName}>
            {folderName}
          </dd>
          <dt className="text-zinc-500">Rozmiar</dt>
          <dd className="text-zinc-800">{formatSize(asset.size)}</dd>
          {asset.width && asset.height ? (
            <>
              <dt className="text-zinc-500">Wymiary</dt>
              <dd className="text-zinc-800">
                {asset.width} × {asset.height}
              </dd>
            </>
          ) : null}
          <dt className="text-zinc-500">Wgrano</dt>
          <dd className="text-zinc-800">
            {formatDate(asset.createdAt)}
            {asset.uploadedBy ? ` · ${asset.uploadedBy}` : ""}
          </dd>
        </dl>

        <div>
          <span className={ui.label}>Używany na stronach</span>
          {usage === null ? (
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
          ) : usage.length === 0 ? (
            <p className="text-[12px] text-zinc-500">Nigdzie — można go bezpiecznie usunąć.</p>
          ) : (
            <ul className="space-y-0.5">
              {usage.map((slug) => (
                <li key={slug} className="truncate font-mono text-[11px] text-zinc-700">
                  {slug}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-200 pt-3">
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className={`${ui.btnSecondarySm} flex-1`}>
            <ExternalIcon className="h-3.5 w-3.5" /> Otwórz
          </a>
          {canDelete && mode === "manage" && (
            <button type="button" onClick={onDelete} className={`${ui.btnSecondarySm} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}>
              <TrashIcon className="h-3.5 w-3.5" /> Usuń
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
