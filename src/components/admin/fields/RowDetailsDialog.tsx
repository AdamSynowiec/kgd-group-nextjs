"use client";

import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import { uploadAsset, type Session } from "@/lib/adminApi";
import { legacyTabs, parseArea, roomsTotal, visibleTabs, type CardRoom, type CardTab, type LegacyUnitView } from "@/lib/investments/unitCards";
import { CloseIcon, ExternalIcon, FileIcon, PlusIcon, TrashIcon } from "../icons";
import { ui } from "../ui";
import { getIn, type DetailField, type RowDetailsConfig } from "./rowDetails";
import LibraryButton from "../assets/LibraryButton";
import { inputClass } from "./types";

const TAB_SUGGESTIONS = ["Parter", "Piętro", "Poddasze", "Garaż", "Rzut", "Ogród"];

const str = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const fileName = (url: string) => decodeURIComponent(url.split("/").pop() ?? url);
const formatArea = (value: number) => `${value.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} m²`;

type Pane = "summary" | "files" | number;

/**
 * Okno "Więcej" wiersza tabeli — układ z konfiguracji (rowDetails.ts): po lewej nawigacja
 * (podsumowanie, przyciski-zakładki w kolejności na stronie, pliki), po prawej edycja wybranej części.
 * Zmiany trafiają od razu do wiersza (zapis strony przyciskiem "Zapisz zmiany").
 */
export default function RowDetailsDialog({
  config,
  row,
  rows,
  rowIndex,
  siblings,
  session,
  onSet,
  onClose,
}: {
  config: RowDetailsConfig;
  row: Record<string, unknown>;
  /** Cała tabela — podpowiedzi wartości i "Skopiuj przyciski z…". */
  rows: Record<string, unknown>[];
  rowIndex: number;
  /** Pola strony obok tabeli (wspólne pliki, stare zakładki, nazwa podsumowania). */
  siblings: Record<string, unknown>;
  session: Session | null;
  /** Ustawia pole wiersza pod kluczem "a.b" (zagnieżdżone obiekty powstają same). */
  onSet: (key: string, value: unknown) => void;
  onClose: () => void;
}) {
  const tabsKey = config.tabs?.key;
  const tabs = tabsKey ? ((getIn(row, tabsKey) as CardTab[] | undefined) ?? []) : [];
  const [pane, setPane] = useState<Pane>(config.summary ? "summary" : tabs.length > 0 ? 0 : "files");
  const activeIndex = typeof pane === "number" && pane < tabs.length ? pane : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const setTabs = (next: CardTab[]) => tabsKey && onSet(tabsKey, next);

  function addTab(label: string) {
    setTabs([...tabs, { label, image: "", text: "", rooms: [{ name: "", area: "" }] }]);
    setPane(tabs.length);
  }

  function moveTab(from: number, to: number) {
    if (to < 0 || to >= tabs.length) return;
    const next = [...tabs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTabs(next);
    if (pane === from) setPane(to);
  }

  function removeTab(index: number) {
    if (!window.confirm(`Usunąć przycisk „${tabs[index].label || "bez nazwy"}” razem z jego zawartością?`)) return;
    setTabs(tabs.filter((_, i) => i !== index));
    setPane(tabs.length > 1 ? Math.max(0, index - 1) : config.summary ? "summary" : "files");
  }

  function replaceTabs(next: CardTab[], what: string) {
    if (tabs.length > 0 && !window.confirm(`Zastąpić obecne przyciski (${tabs.length}) przyciskami z: ${what}?`)) return;
    setTabs(structuredClone(next));
    setPane(next.length > 0 ? 0 : config.summary ? "summary" : "files");
  }

  const titleKey = config.title ?? "unit";
  const rowName = (other: Record<string, unknown>, index: number) => str(other[titleKey]) || `Wiersz ${index + 1}`;
  const copySources = tabsKey
    ? rows.flatMap((other, index) => (index !== rowIndex && visibleTabs({ tabs: getIn(other, tabsKey) as CardTab[] }).length > 0 ? [{ name: rowName(other, index), tabs: visibleTabs({ tabs: getIn(other, tabsKey) as CardTab[] }) }] : []))
    : [];
  const legacySource = config.tabs?.legacySibling ? siblings[config.tabs.legacySibling] : undefined;
  const legacy = Array.isArray(legacySource) ? legacyTabs(legacySource as LegacyUnitView[], str(row.unit), str(row.type)) : [];
  const summaryLabel = (config.summary?.labelSibling ? str(siblings[config.summary.labelSibling]) : "") || config.summary?.label || "Podsumowanie";
  const fileFields = config.files?.fields ?? [];
  const filesCount = fileFields.filter((field) => str(getIn(row, field.key))).length;
  const subtitle = (config.subtitle ?? [])
    .map((key) => {
      const value = str(row[key]);
      return key === "area" && parseArea(value) ? formatArea(parseArea(value)!) : value;
    })
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={rowName(row, rowIndex)}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-[min(880px,100%)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-900/10"
      >
        {/* Nagłówek */}
        <div className="flex items-center gap-4 border-b border-zinc-200 px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{config.column ?? "Szczegóły"}</div>
            <div className="truncate text-lg font-semibold tracking-tight text-zinc-900">
              {rowName(row, rowIndex)}
              {subtitle && <span className="ml-2 text-sm font-normal text-zinc-500">{subtitle}</span>}
            </div>
          </div>
          {copySources.length > 0 && (
            <select
              value=""
              onChange={(event) => {
                const source = copySources[Number(event.target.value)];
                if (source) replaceTabs(source.tabs, source.name);
              }}
              aria-label="Skopiuj przyciski z innego wiersza"
              className="hidden rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-700 sm:block"
            >
              <option value="">Skopiuj przyciski z…</option>
              {copySources.map((source, index) => (
                <option key={index} value={index}>
                  {source.name} — {source.tabs.map((tab) => tab.label).join(", ")}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={onClose} className={ui.btnPrimarySm}>
            Gotowe
          </button>
          <button type="button" onClick={onClose} aria-label="Zamknij" className={ui.iconBtn}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[250px_minmax(0,1fr)]">
          <nav aria-label="Części okna" className="flex min-h-0 flex-col border-b border-zinc-200 bg-zinc-50/70 md:border-b-0 md:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {(config.summary || config.tabs) && <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{config.tabs?.label ?? "Dane"}</div>}
              {config.summary && <NavItem active={pane === "summary"} onClick={() => setPane("summary")} title={summaryLabel} subtitle="dane wiersza" />}
              {tabs.map((tab, index) => {
                const total = roomsTotal(tab.rooms);
                const rooms = (tab.rooms ?? []).filter((room) => room.name.trim()).length;
                return (
                  <div key={index} className="group relative">
                    <NavItem
                      active={activeIndex === index}
                      onClick={() => setPane(index)}
                      title={tab.label || "bez nazwy"}
                      subtitle={[rooms ? `${rooms} pomieszcz.` : "", total ? formatArea(total) : "", tab.image ? "zdjęcie" : ""].filter(Boolean).join(" · ") || "pusty"}
                      number={index + 1}
                    />
                    <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => moveTab(index, index - 1)} disabled={index === 0} aria-label="Przesuń wyżej" className="px-1 text-[9px] leading-none text-zinc-400 hover:text-zinc-800 disabled:opacity-25">
                        ▲
                      </button>
                      <button type="button" onClick={() => moveTab(index, index + 1)} disabled={index === tabs.length - 1} aria-label="Przesuń niżej" className="px-1 text-[9px] leading-none text-zinc-400 hover:text-zinc-800 disabled:opacity-25">
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
              {config.tabs && <AddTabButton existing={tabs.map((tab) => tab.label)} onAdd={addTab} />}

              {config.files && (
                <>
                  <div className="mt-5 px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Pliki</div>
                  <NavItem
                    active={pane === "files"}
                    onClick={() => setPane("files")}
                    title={config.files.label ?? "Pliki"}
                    subtitle={filesCount > 0 ? `${filesCount} z ${fileFields.length}` : "brak własnych plików"}
                    icon
                  />
                </>
              )}
            </div>
            {config.tabs && tabs.length === 0 && legacy.length > 0 && (
              <div className="border-t border-zinc-200 p-3">
                <p className="text-[12px] leading-snug text-zinc-500">Na stronie są dziś stare zakładki: {legacy.map((tab) => tab.label).join(", ")}.</p>
                <button type="button" onClick={() => replaceTabs(legacy, "starych zakładek")} className={`${ui.btnSecondarySm} mt-2 w-full`}>
                  Wczytaj je do edycji
                </button>
              </div>
            )}
          </nav>

          <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
            {activeIndex !== null ? (
              <TabEditor
                key={activeIndex}
                tab={tabs[activeIndex]}
                session={session}
                onChange={(patch) => setTabs(tabs.map((tab, i) => (i === activeIndex ? { ...tab, ...patch } : tab)))}
                onDuplicate={() => {
                  setTabs([...tabs.slice(0, activeIndex + 1), { ...structuredClone(tabs[activeIndex]), label: `${tabs[activeIndex].label} (kopia)` }, ...tabs.slice(activeIndex + 1)]);
                  setPane(activeIndex + 1);
                }}
                onRemove={() => removeTab(activeIndex)}
              />
            ) : pane === "files" && config.files ? (
              <div className="max-w-2xl space-y-5">
                <PaneTitle title={config.files.label ?? "Pliki"} text={config.files.text ?? ""} />
                {fileFields.map((field) => {
                  const fallback = field.fallbackSibling ? str(siblings[field.fallbackSibling]) : "";
                  return (
                    <DocSlot
                      key={field.key}
                      label={field.label}
                      url={str(getIn(row, field.key))}
                      empty={fallback ? `Teraz na stronie: wspólny plik (${fileName(fallback)})` : (field.emptyText ?? "Brak pliku")}
                      session={session}
                      onChange={(url) => onSet(field.key, url)}
                    />
                  );
                })}
              </div>
            ) : config.summary ? (
              <SummaryForm config={config} row={row} rows={rows} label={summaryLabel} session={session} onSet={onSet} />
            ) : null}
            {pane === "summary" && config.tabs && tabs.length === 0 && (
              <button type="button" onClick={() => addTab("Parter")} className={`${ui.btnSecondarySm} mt-6`}>
                <PlusIcon className="h-3.5 w-3.5" /> Dodaj pierwszy przycisk („Parter”)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Formularz "Podsumowania": zdjęcie po lewej, pola w siatce, długie teksty pod spodem. */
function SummaryForm({
  config,
  row,
  rows,
  label,
  session,
  onSet,
}: {
  config: RowDetailsConfig;
  row: Record<string, unknown>;
  rows: Record<string, unknown>[];
  label: string;
  session: Session | null;
  onSet: (key: string, value: unknown) => void;
}) {
  const fields = config.summary?.fields ?? [];
  const image = fields.find((field) => field.type === "image");
  const inputs = fields.filter((field) => field.type !== "image" && field.type !== "textarea" && field.type !== "file");
  const texts = fields.filter((field) => field.type === "textarea");
  const area = parseArea(str(row.area));
  const pricePerM2 = parseArea(str(row.pricePerM2));
  const computedPrice = area && pricePerM2 ? `${Math.round(area * pricePerM2).toLocaleString("pl-PL")} zł (PUM × cena za m²)` : "";
  const suggestionsFor = (field: DetailField) =>
    field.suggest ? Array.from(new Set(rows.map((other) => str(getIn(other, field.key))).filter(Boolean))).slice(0, 30) : [];

  return (
    <div className="max-w-4xl">
      <PaneTitle title={label} text={config.summary?.text ?? ""} />
      <div className={`mt-5 grid gap-5 ${image ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""}`}>
        {image && <ImageSlot url={str(getIn(row, image.key))} session={session} onChange={(url) => onSet(image.key, url)} />}
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {inputs.map((field) => {
              const suggestions = suggestionsFor(field);
              const listId = `details-${field.key}`;
              return (
                <label key={field.key} className={field.key === "price" ? "col-span-2 sm:col-span-3" : ""}>
                  <span className="mb-1 block text-[12px] font-medium text-zinc-600">{field.label}</span>
                  <input
                    value={str(getIn(row, field.key))}
                    onChange={(event) => onSet(field.key, event.target.value)}
                    inputMode={field.type === "number" ? "decimal" : undefined}
                    list={suggestions.length ? listId : undefined}
                    placeholder={field.key === "price" && computedPrice ? computedPrice : field.placeholder}
                    className={`${inputClass} py-1.5 ${field.type === "number" ? "tabular-nums" : ""}`}
                  />
                  {suggestions.length > 0 && (
                    <datalist id={listId}>
                      {suggestions.map((value) => (
                        <option key={value} value={value} />
                      ))}
                    </datalist>
                  )}
                </label>
              );
            })}
          </div>
          {texts.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-[12px] font-medium text-zinc-600">{field.label}</span>
              <textarea value={str(getIn(row, field.key))} onChange={(event) => onSet(field.key, event.target.value)} rows={3} placeholder={field.placeholder} className={`${inputClass} resize-y leading-relaxed`} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function PaneTitle({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{text}</p>
    </div>
  );
}

function NavItem({ active, onClick, title, subtitle, number, muted, icon }: { active: boolean; onClick: () => void; title: string; subtitle: string; number?: number; muted?: boolean; icon?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 pr-7 text-left transition ${active ? "bg-white shadow-[0_1px_2px_rgba(16,24,40,0.08)] ring-1 ring-zinc-200" : "hover:bg-white/70"}`}
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold ${active ? "bg-zinc-900 text-white" : "bg-zinc-200/70 text-zinc-500"}`}>
        {icon ? <FileIcon className="h-3.5 w-3.5" /> : (number ?? "•")}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] font-medium ${muted ? "text-zinc-500" : "text-zinc-800"}`}>{title}</span>
        <span className="block truncate text-[11px] text-zinc-400">{subtitle}</span>
      </span>
    </button>
  );
}

function AddTabButton({ existing, onAdd }: { existing: string[]; onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const suggestions = TAB_SUGGESTIONS.filter((label) => !existing.some((name) => name.trim().toLowerCase() === label.toLowerCase()));

  function add(label: string) {
    if (!label.trim()) return;
    onAdd(label.trim());
    setCustom("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-2.5 py-2 text-[13px] font-medium text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
      >
        <PlusIcon className="h-4 w-4" /> Dodaj przycisk
      </button>
    );
  }

  return (
    <div className="mt-1 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          add(custom);
        }}
        className="flex gap-1.5"
      >
        <input autoFocus value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Nazwa, np. Garaż" aria-label="Nazwa przycisku" className={`${inputClass} py-1.5 text-[13px]`} />
        <button type="submit" className={ui.btnPrimarySm} disabled={!custom.trim()}>
          Dodaj
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestions.map((label) => (
            <button key={label} type="button" onClick={() => add(label)} className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-indigo-50 hover:text-indigo-700">
              {label}
            </button>
          ))}
        </div>
      )}
      <button type="button" onClick={() => setOpen(false)} className="mt-2 text-[11px] text-zinc-400 hover:text-zinc-700">
        Anuluj
      </button>
    </div>
  );
}

/** Zawartość jednego przycisku — zawsze ten sam układ: nazwa, zdjęcie, opis, tabela pomieszczeń. */
function TabEditor({ tab, session, onChange, onDuplicate, onRemove }: { tab: CardTab; session: Session | null; onChange: (patch: Partial<CardTab>) => void; onDuplicate: () => void; onRemove: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <label className={ui.label}>Nazwa przycisku</label>
          <input value={tab.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="np. Parter" className={`${inputClass} text-base font-medium`} />
        </div>
        <button type="button" onClick={onDuplicate} className={ui.btnSecondarySm}>
          Duplikuj
        </button>
        <button type="button" onClick={onRemove} className={`${ui.btnSecondarySm} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}>
          <TrashIcon className="h-3.5 w-3.5" /> Usuń przycisk
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ImageSlot url={tab.image ?? ""} session={session} onChange={(image) => onChange({ image })} />
        <div className="min-w-0 space-y-5">
          <div>
            <label className={ui.label}>Opis</label>
            <textarea
              value={tab.text ?? ""}
              onChange={(event) => onChange({ text: event.target.value })}
              rows={5}
              placeholder="Opis tej części lokalu (nowa linia = nowy akapit)."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </div>
          <RoomsEditor rooms={tab.rooms ?? []} onChange={(rooms) => onChange({ rooms })} />
        </div>
      </div>
    </div>
  );
}

/** "Salon 32,5" / "Salon: 32,5 m²" / "Salon<TAB>32,5" / "Salon | 32,5" -> { name, area }. */
function parsePastedLine(line: string): CardRoom | null {
  const clean = line.trim();
  if (!clean) return null;
  const match = clean.match(/^(.*?)[\s:|;\t–-]+(\d+(?:[.,]\d+)?)\s*(?:m2|m²|m\^2)?\.?$/i);
  return match ? { name: match[1].trim(), area: match[2] } : { name: clean, area: "" };
}

function RoomsEditor({ rooms, onChange }: { rooms: CardRoom[]; onChange: (rooms: CardRoom[]) => void }) {
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const total = roomsTotal(rooms);

  const setRoom = (index: number, patch: Partial<CardRoom>) => onChange(rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)));

  function addRow() {
    onChange([...rooms, { name: "", area: "" }]);
    setFocusRow(rooms.length);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rooms.length) return;
    const next = [...rooms];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-zinc-700">Tabela metraży</span>
        <button type="button" onClick={() => setPasting((value) => !value)} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
          {pasting ? "Anuluj wklejanie" : "Wklej listę…"}
        </button>
      </div>

      {pasting && (
        <div className="mb-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
          <textarea
            autoFocus
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={5}
            placeholder={"Jedno pomieszczenie w linii, np.:\nSalon z aneksem 42,5\nŁazienka: 6,2 m²\n(działa też wklejenie dwóch kolumn z Excela)"}
            className={`${inputClass} font-mono text-[12px]`}
          />
          <button
            type="button"
            className={`${ui.btnPrimarySm} mt-2`}
            disabled={!pasted.trim()}
            onClick={() => {
              const parsed = pasted.split(/\r?\n/).map(parsePastedLine).filter((room): room is CardRoom => room !== null);
              onChange([...rooms.filter((room) => room.name.trim() || str(room.area)), ...parsed]);
              setPasted("");
              setPasting(false);
            }}
          >
            Dodaj do tabeli
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              <th className="w-px px-2 py-1.5" />
              <th className="px-2 py-1.5">Pomieszczenie</th>
              <th className="w-32 px-2 py-1.5">Metraż</th>
              <th className="w-px whitespace-nowrap px-2 py-1.5 text-center" title="Pokazuj w tabeli, ale nie doliczaj do sumy (np. taras, balkon)">
                Nie wliczaj
              </th>
              <th className="w-px px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rooms.map((room, index) => (
              <tr key={index} className={`border-t border-zinc-100 ${room.excluded ? "bg-zinc-50" : ""}`}>
                <td className="px-1 py-1">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="W górę" className="px-1 text-[9px] leading-none text-zinc-400 hover:text-zinc-800 disabled:opacity-25">
                      ▲
                    </button>
                    <button type="button" onClick={() => move(index, index + 1)} disabled={index === rooms.length - 1} aria-label="W dół" className="px-1 text-[9px] leading-none text-zinc-400 hover:text-zinc-800 disabled:opacity-25">
                      ▼
                    </button>
                  </div>
                </td>
                <td className="px-1.5 py-1">
                  <input autoFocus={focusRow === index} value={room.name} onChange={(event) => setRoom(index, { name: event.target.value })} placeholder="np. Salon" aria-label={`Pomieszczenie ${index + 1}`} className={`${inputClass} py-1.5`} />
                </td>
                <td className="px-1.5 py-1">
                  <div className="relative">
                    <input
                      value={String(room.area ?? "")}
                      inputMode="decimal"
                      onChange={(event) => setRoom(index, { area: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (index === rooms.length - 1) addRow();
                        }
                      }}
                      placeholder="0"
                      aria-label={`Metraż pomieszczenia ${index + 1}`}
                      className={`${inputClass} py-1.5 pr-9 text-right tabular-nums ${str(room.area) && parseArea(room.area) === null ? "border-amber-400" : ""}`}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">m²</span>
                  </div>
                </td>
                <td className="px-1.5 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={room.excluded === true}
                    onChange={(event) => setRoom(index, { excluded: event.target.checked || undefined })}
                    aria-label={`Nie wliczaj pomieszczenia ${index + 1} do sumy`}
                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                  />
                </td>
                <td className="px-1.5 py-1">
                  <button type="button" onClick={() => onChange(rooms.filter((_, i) => i !== index))} aria-label={`Usuń pomieszczenie ${index + 1}`} className={ui.iconBtn}>
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-xs text-zinc-400">
                  Brak pomieszczeń — tabela nie pojawi się na stronie.
                </td>
              </tr>
            )}
          </tbody>
          {total > 0 && (
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50/80">
                <td />
                <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Razem (liczone automatycznie{rooms.some((room) => room.excluded) ? ", bez zaznaczonych „nie wliczaj”" : ""})
                </td>
                <td className="px-3 py-2 pr-4 text-right text-sm font-semibold tabular-nums text-zinc-900">{formatArea(total)}</td>
                <td />
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
        >
          <PlusIcon className="h-3.5 w-3.5" /> Dodaj pomieszczenie
        </button>
        <span className="text-[11px] text-zinc-400">Enter w ostatnim metrażu dodaje wiersz</span>
      </div>
    </div>
  );
}

/** Wspólny upload (klik albo przeciągnij i upuść) dla zdjęcia przycisku i PDF-ów karty. */
function useUpload(session: Session | null, onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      onUploaded(await uploadAsset(file, session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przesłać pliku.");
    } finally {
      setUploading(false);
    }
  }

  const dropProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      const file = event.dataTransfer.files?.[0];
      if (file && !uploading) void handleFile(file);
    },
  };

  const inputProps = {
    type: "file" as const,
    className: "hidden",
    disabled: uploading,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void handleFile(file);
    },
  };

  return { uploading, error, dragOver, dropProps, inputProps };
}

function ImageSlot({ url, session, onChange }: { url: string; session: Session | null; onChange: (url: string) => void }) {
  const { uploading, error, dragOver, dropProps, inputProps } = useUpload(session, onChange);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-zinc-700">Zdjęcie / rzut</span>
        <LibraryButton session={session} accept="image" onPick={onChange} />
      </div>
      <label
        {...dropProps}
        className={`group relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-lg border transition ${
          dragOver ? "border-indigo-400 bg-indigo-50 ring-4 ring-indigo-500/10" : url ? "border-zinc-200 bg-zinc-100" : "border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400"
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- podgląd w panelu admina, nie treść strony
          <img src={url} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="px-4 text-center text-xs text-zinc-500">Kliknij albo upuść zdjęcie / rzut</span>
        )}
        <span className={`absolute inset-0 grid place-items-center bg-zinc-950/50 text-xs font-medium text-white transition ${uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : url ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
        </span>
        <input {...inputProps} accept="image/*" />
      </label>
      <div className="mt-1.5 flex gap-1.5">
        <input value={url} onChange={(event) => onChange(event.target.value)} placeholder="lub wklej adres zdjęcia" aria-label="Adres zdjęcia" className={`${inputClass} py-1.5 font-mono text-[11px]`} />
        {url && (
          <button type="button" onClick={() => onChange("")} aria-label="Usuń zdjęcie" className={ui.iconBtn}>
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DocSlot({ label, url, empty, session, onChange }: { label: string; url: string; empty: string; session: Session | null; onChange: (url: string) => void }) {
  const { uploading, error, dragOver, dropProps, inputProps } = useUpload(session, onChange);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-zinc-700">{label}</span>
        <LibraryButton session={session} accept="pdf" onPick={onChange} />
      </div>
      {url ? (
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-red-50 text-[10px] font-bold text-red-600 ring-1 ring-inset ring-red-600/15">PDF</span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700" title={url}>
            {fileName(url)}
          </span>
          <a href={url} target="_blank" rel="noopener noreferrer" className={ui.iconBtn} aria-label="Otwórz plik">
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>
          <label className={`${ui.btnSecondarySm} cursor-pointer`}>
            Podmień
            <input {...inputProps} accept="application/pdf" />
          </label>
          <button type="button" onClick={() => onChange("")} className={ui.iconBtn} aria-label="Usuń plik">
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label
          {...dropProps}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-3 transition ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-zinc-300 bg-zinc-50 hover:border-zinc-400"}`}
        >
          {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" /> : <PlusIcon className="h-4 w-4 text-zinc-400" />}
          <span className="min-w-0 flex-1 text-[13px] leading-snug text-zinc-600">
            {uploading ? "Przesyłanie…" : "Upuść PDF albo kliknij, aby wybrać"}
            <span className="block text-[11px] text-zinc-400">{empty}</span>
          </span>
          <input {...inputProps} accept="application/pdf" />
        </label>
      )}
      <input value={url} onChange={(event) => onChange(event.target.value)} placeholder="lub wklej adres pliku" aria-label={`Adres pliku: ${label}`} className={`${inputClass} mt-1.5 py-1.5 font-mono text-[11px]`} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
