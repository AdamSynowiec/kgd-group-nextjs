"use client";

import { useEffect, useState } from "react";
import { CloseIcon, SearchIcon } from "../icons";
import { ui } from "../ui";
import PlanEditor, { parsePolygon, type PlanShape } from "./PlanEditor";
import type { RowDetailsConfig } from "./rowDetails";

type PlanConfig = NonNullable<RowDetailsConfig["plan"]>;

const str = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

/** Wymiary zdjęcia planu: z pól strony (planWidth/planHeight), a gdy ich brak — odczytane z samego zdjęcia. */
export function usePlanImage(config: PlanConfig, siblings: Record<string, unknown>) {
  const image = str(siblings[config.imageSibling]);
  const declaredWidth = config.widthSibling ? Number(siblings[config.widthSibling]) : NaN;
  const declaredHeight = config.heightSibling ? Number(siblings[config.heightSibling]) : NaN;
  const [natural, setNatural] = useState<{ src: string; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!image || (declaredWidth > 0 && declaredHeight > 0)) return;
    const img = new Image();
    img.onload = () => setNatural({ src: image, width: img.naturalWidth, height: img.naturalHeight });
    img.src = image;
  }, [image, declaredWidth, declaredHeight]);

  if (!image) return null;
  if (declaredWidth > 0 && declaredHeight > 0) return { image, width: declaredWidth, height: declaredHeight };
  return natural?.src === image ? { image, width: natural.width, height: natural.height } : null;
}

export function shapesFor(config: PlanConfig, rows: Record<string, unknown>[]): PlanShape[] {
  const labelKey = config.labelKey ?? "unit";
  return rows.map((row, index) => ({
    index,
    label: str(row[labelKey]) || `Wiersz ${index + 1}`,
    polygon: str(row[config.key]),
    status: config.statusKey ? str(row[config.statusKey]) : undefined,
  }));
}

/**
 * "Obrysy na planie" nad tabelą (TableEditor.tsx) — cały plan i wszystkie wiersze naraz: wybór lokalu
 * z listy albo kliknięciem w jego obrys, rysowanie nowego obrysu i przypisanie go do lokalu, poprawki punktów.
 */
export default function PlanEditorDialog({
  config,
  rows,
  siblings,
  onSet,
  onClose,
}: {
  config: PlanConfig;
  rows: Record<string, unknown>[];
  siblings: Record<string, unknown>;
  onSet: (index: number, polygon: string) => void;
  onClose: () => void;
}) {
  const plan = usePlanImage(config, siblings);
  const shapes = shapesFor(config, rows);
  const [active, setActive] = useState<number | null>(() => {
    const firstMissing = shapes.find((shape) => parsePolygon(shape.polygon).length === 0);
    return firstMissing ? firstMissing.index : null;
  });
  const [pending, setPending] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function pick(index: number) {
    if (pending) {
      const target = shapes[index];
      if (parsePolygon(target.polygon).length > 0 && !window.confirm(`Lokal ${target.label} ma już obrys — zastąpić go nowym?`)) return;
      onSet(index, pending);
      setPending(null);
    }
    setActive(index);
  }

  const done = shapes.filter((shape) => parsePolygon(shape.polygon).length > 0).length;
  const visible = shapes.filter((shape) => !query.trim() || shape.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-2 backdrop-blur-[2px] sm:p-4">
      <div role="dialog" aria-modal="true" aria-label={config.label ?? "Obrysy na planie"} className="flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-zinc-900/10">
        <div className="flex items-center gap-3 border-b border-zinc-200 px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-zinc-900">{config.label ?? "Obrysy na planie"}</div>
            <div className="text-[12px] text-zinc-500">
              Obrysy ma {done} z {shapes.length} lokali · zmiany trafiają do tabeli od razu, zapis strony przyciskiem „Zapisz zmiany”.
            </div>
          </div>
          <button type="button" onClick={onClose} className={ui.btnPrimarySm}>
            Gotowe
          </button>
          <button type="button" onClick={onClose} aria-label="Zamknij" className={ui.iconBtn}>
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 md:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Lokale" className="flex min-h-0 flex-col border-b border-zinc-200 bg-zinc-50/70 md:border-b-0 md:border-r">
            {pending ? (
              <div className="m-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-[13px] text-white">
                <div className="font-semibold">Nowy obrys gotowy</div>
                <div className="mt-0.5 text-indigo-100">Kliknij lokal poniżej, aby go przypisać.</div>
                <button type="button" onClick={() => setPending(null)} className="mt-2 text-[12px] font-medium text-white/80 underline hover:text-white">
                  Odrzuć obrys
                </button>
              </div>
            ) : (
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className={`w-full rounded-lg border border-dashed px-3 py-2 text-left text-[13px] font-medium transition ${active === null ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-zinc-300 text-zinc-600 hover:border-indigo-300"}`}
                >
                  + Nowy obrys (przypiszesz po narysowaniu)
                </button>
              </div>
            )}
            <label className="relative mx-2 mb-2 block">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj lokalu…" aria-label="Szukaj lokalu" className={`${ui.input} py-1.5 pl-8 text-[13px]`} />
            </label>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {visible.map((shape) => {
                const has = parsePolygon(shape.polygon).length > 0;
                return (
                  <li key={shape.index}>
                    <button
                      type="button"
                      onClick={() => pick(shape.index)}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
                        active === shape.index && !pending ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200" : pending ? "text-zinc-700 hover:bg-indigo-50" : "text-zinc-600 hover:bg-white/70"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{shape.label}</span>
                      {shape.status && <span className="truncate text-[11px] text-zinc-400">{shape.status}</span>}
                      <span className={`${ui.badge} shrink-0 px-1.5 text-[10px] ${has ? ui.badgeSuccess : ui.badgeWarning}`}>{has ? "obrys" : "brak"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-h-0">
            {plan ? (
              <PlanEditor
                image={plan.image}
                width={plan.width}
                height={plan.height}
                shapes={pending ? [...shapes, { index: -1, label: "nowy obrys", polygon: pending }] : shapes}
                active={pending ? null : active}
                onActiveChange={(index) => !pending && setActive(index)}
                onChange={onSet}
                onAssign={(polygon) => setPending(polygon)}
              />
            ) : (
              <p className="p-6 text-sm text-zinc-500">Brak zdjęcia planu — ustaw je w polu planu tej sekcji.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
