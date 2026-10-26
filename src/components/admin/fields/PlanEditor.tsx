"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { ui } from "../ui";

type Point = [number, number];
type ViewBox = { x: number; y: number; w: number; h: number };

export type PlanShape = {
  /** Indeks wiersza tabeli. */
  index: number;
  label: string;
  /** "x,y x,y ..." — kilka części rozdzielonych "|". */
  polygon: string;
  status?: string;
};

/** "x,y x,y|x,y ..." <-> [[[x,y],...], ...] — format kolumny "polygon" (współrzędne pikseli zdjęcia planu). */
export function parsePolygon(raw: string | undefined): Point[][] {
  return (raw ?? "")
    .split("|")
    .map((part) =>
      part
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(",").map(Number) as Point)
        .filter((point) => point.length === 2 && point.every(Number.isFinite))
    )
    .filter((part) => part.length >= 3);
}

export function formatPolygon(parts: Point[][]): string {
  return parts
    .filter((part) => part.length >= 3)
    .map((part) => part.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(" "))
    .join("|");
}

function statusColor(status: string | undefined): string {
  const value = (status ?? "").trim().toLowerCase();
  if (value.startsWith("sprzed")) return "#ef4444";
  if (value.startsWith("rezerw") || value.startsWith("zarezerw")) return "#eab308";
  return "#22c55e";
}

const center = (part: Point[]): Point => [part.reduce((s, p) => s + p[0], 0) / part.length, part.reduce((s, p) => s + p[1], 0) / part.length];

/**
 * Edytor obrysów na zdjęciu planu (kolumna "polygon" tabeli lokali; konfiguracja "plan" w rowDetails.ts).
 *
 *   Edycja aktywnego obrysu: przeciągnij punkt · klik w „+” na środku krawędzi dodaje punkt ·
 *   Alt+klik na punkcie (albo zaznacz i Delete) usuwa punkt.
 *   Rysowanie: klikaj kolejne punkty, zamknij klikiem w pierwszy punkt albo Enterem; Backspace cofa
 *   ostatni punkt, Esc przerywa. Punkty przyklejają się do narożników innych obrysów (Shift — bez przyklejania).
 *   Widok: kółko myszy — zoom, przeciąganie tła — przesuwanie. Ctrl+Z — cofnij.
 */
export default function PlanEditor({
  image,
  width,
  height,
  shapes,
  active,
  onActiveChange,
  onChange,
  onAssign,
}: {
  image: string;
  width: number;
  height: number;
  shapes: PlanShape[];
  /** Indeks wiersza edytowanego obrysu (null = żaden — nowy obrys trzeba przypisać po narysowaniu). */
  active: number | null;
  /** Bez tej funkcji kliknięcie w inny obrys nic nie zmienia (np. w oknie jednego lokalu). */
  onActiveChange?: (index: number | null) => void;
  onChange: (index: number, polygon: string) => void;
  /** Wywoływane po narysowaniu obrysu bez aktywnego wiersza — zwraca wybór lokalu przez panel obok. */
  onAssign?: (polygon: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>({ x: 0, y: 0, w: width, h: height });
  const [mode, setMode] = useState<"edit" | "draw" | "part">("edit");
  const [draft, setDraft] = useState<Point[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [snapPoint, setSnapPoint] = useState<Point | null>(null);
  const [drag, setDrag] = useState<{ part: number; vertex: number; parts: Point[][] } | null>(null);
  const [selectedVertex, setSelectedVertex] = useState<{ part: number; vertex: number } | null>(null);
  const [history, setHistory] = useState<{ index: number; polygon: string }[]>([]);
  const pan = useRef<{ x: number; y: number; view: ViewBox; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);

  // Nowe wymiary zdjęcia (np. po wczytaniu) — widok od nowa.
  const [prevSize, setPrevSize] = useState(`${width}x${height}`);
  if (prevSize !== `${width}x${height}`) {
    setPrevSize(`${width}x${height}`);
    setView({ x: 0, y: 0, w: width, h: height });
  }

  const activeShape = shapes.find((shape) => shape.index === active) ?? null;
  const activeParts = drag ? drag.parts : parsePolygon(activeShape?.polygon);

  // Rozmiar SVG na ekranie — do przeliczenia piksela ekranu na jednostki zdjęcia (uchwyty, przyciąganie).
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = svgRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  /** Jeden piksel ekranu w jednostkach zdjęcia (viewBox z preserveAspectRatio "meet"). */
  const px = box.width > 0 && box.height > 0 ? Math.max(view.w / box.width, view.h / box.height) : view.w / 1000;
  const unit = () => px;

  const toImage = (event: { clientX: number; clientY: number }): Point => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM()?.inverse());
    return [Math.max(0, Math.min(width, local.x)), Math.max(0, Math.min(height, local.y))];
  };

  /** Przyciąganie do narożników wszystkich obrysów (i pierwszego punktu rysowanego). */
  const snap = (point: Point, noSnap: boolean): Point | null => {
    if (noSnap) return null;
    const limit = 8 * unit();
    let best: Point | null = null;
    let bestDist = limit;
    const candidates: Point[] = [...shapes.flatMap((shape) => parsePolygon(shape.polygon).flat()), ...draft.slice(0, 1)];
    for (const candidate of candidates) {
      const dist = Math.hypot(candidate[0] - point[0], candidate[1] - point[1]);
      if (dist < bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
    return best;
  };

  const commit = useCallback(
    (index: number, polygon: string) => {
      const before = shapes.find((shape) => shape.index === index)?.polygon ?? "";
      if (before === polygon) return;
      setHistory((prev) => [...prev.slice(-49), { index, polygon: before }]);
      onChange(index, polygon);
    },
    [shapes, onChange]
  );

  function finishDraw() {
    if (draft.length < 3) return;
    const part = draft;
    setDraft([]);
    setMode("edit");
    if (active === null) {
      onAssign?.(formatPolygon([part]));
      return;
    }
    commit(active, formatPolygon(mode === "part" ? [...parsePolygon(activeShape?.polygon), part] : [part]));
  }

  function cancelDraw() {
    setDraft([]);
    setMode("edit");
  }

  function removeVertex(part: number, vertex: number) {
    if (active === null) return;
    const parts = parsePolygon(activeShape?.polygon);
    if (parts[part].length <= 3) {
      if (!window.confirm("Obrys ma tylko 3 punkty — usunąć całą tę część obrysu?")) return;
      parts.splice(part, 1);
    } else {
      parts[part].splice(vertex, 1);
    }
    setSelectedVertex(null);
    commit(active, formatPolygon(parts));
  }

  // Klawiatura: rysowanie, usuwanie punktu, cofanie.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (mode !== "edit") {
        if (event.key === "Enter") {
          event.preventDefault();
          finishDraw();
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelDraw();
        } else if (event.key === "Backspace") {
          event.preventDefault();
          setDraft((prev) => prev.slice(0, -1));
        }
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedVertex) {
        event.preventDefault();
        removeVertex(selectedVertex.part, selectedVertex.vertex);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        const last = history.at(-1);
        if (!last) return;
        event.preventDefault();
        setHistory((prev) => prev.slice(0, -1));
        onChange(last.index, last.polygon);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  function onWheel(event: ReactWheelEvent) {
    const [px, py] = toImage(event);
    const factor = event.deltaY > 0 ? 1.15 : 1 / 1.15;
    setView((prev) => {
      const w = Math.max(width / 20, Math.min(width, prev.w * factor));
      const h = (w / prev.w) * prev.h;
      const x = Math.max(0, Math.min(width - w, px - ((px - prev.x) * w) / prev.w));
      const y = Math.max(0, Math.min(height - h, py - ((py - prev.y) * h) / prev.h));
      return { x, y, w, h };
    });
  }

  function zoom(factor: number) {
    setView((prev) => {
      const w = Math.max(width / 20, Math.min(width, prev.w * factor));
      const h = (w / prev.w) * prev.h;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return { x: Math.max(0, Math.min(width - w, cx - w / 2)), y: Math.max(0, Math.min(height - h, cy - h / 2)), w, h };
    });
  }

  function onBackgroundDown(event: ReactPointerEvent) {
    if (event.button !== 0 && event.button !== 1) return;
    if (mode !== "edit" && event.button === 0) {
      const point = snap(toImage(event), event.shiftKey) ?? toImage(event);
      // Klik w pierwszy punkt zamyka obrys.
      if (draft.length >= 3 && Math.hypot(point[0] - draft[0][0], point[1] - draft[0][1]) < 8 * unit()) {
        finishDraw();
        return;
      }
      setDraft((prev) => [...prev, [Math.round(point[0]), Math.round(point[1])]]);
      return;
    }
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pan.current = { x: event.clientX, y: event.clientY, view, moved: false };
    setPanning(true);
  }

  function onPointerMove(event: ReactPointerEvent) {
    const point = toImage(event);
    const snapped = mode !== "edit" || drag ? snap(point, event.shiftKey) : null;
    setSnapPoint(snapped);
    setCursor(snapped ?? point);

    if (drag && active !== null) {
      const target = snapped ?? point;
      const parts = drag.parts.map((part) => part.map((p) => [...p] as Point));
      parts[drag.part][drag.vertex] = [Math.round(target[0]), Math.round(target[1])];
      setDrag({ ...drag, parts });
      return;
    }
    if (pan.current) {
      const rect = svgRef.current!.getBoundingClientRect();
      const dx = ((event.clientX - pan.current.x) * pan.current.view.w) / rect.width;
      const dy = ((event.clientY - pan.current.y) * pan.current.view.h) / rect.height;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) pan.current.moved = true;
      const start = pan.current.view;
      setView({ ...start, x: Math.max(0, Math.min(width - start.w, start.x - dx)), y: Math.max(0, Math.min(height - start.h, start.y - dy)) });
    }
  }

  function onPointerUp() {
    if (drag && active !== null) {
      commit(active, formatPolygon(drag.parts));
      setDrag(null);
    }
    if (pan.current && !pan.current.moved && mode === "edit") {
      setSelectedVertex(null);
    }
    pan.current = null;
    setPanning(false);
  }

  const r = 5 * unit();
  const stroke = 2 * unit();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        {mode === "edit" ? (
          <>
            <button type="button" onClick={() => setMode("draw")} className={ui.btnPrimarySm}>
              {activeShape && parsePolygon(activeShape.polygon).length > 0 ? "Narysuj od nowa" : active === null ? "Narysuj nowy obrys" : "Narysuj obrys"}
            </button>
            {activeShape && parsePolygon(activeShape.polygon).length > 0 && (
              <>
                <button type="button" onClick={() => setMode("part")} className={ui.btnSecondarySm} title="Drugi wielokąt tego samego lokalu (np. część zasłonięta drzewem)">
                  Dodaj część
                </button>
                <button
                  type="button"
                  onClick={() => active !== null && window.confirm(`Usunąć obrys lokalu ${activeShape.label}?`) && commit(active, "")}
                  className={`${ui.btnSecondarySm} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
                >
                  Usuń obrys
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <span className="text-[13px] font-medium text-indigo-700">
              {mode === "part" ? "Dodawanie części obrysu" : "Rysowanie"}: {draft.length} pkt
            </span>
            <button type="button" onClick={finishDraw} disabled={draft.length < 3} className={ui.btnPrimarySm}>
              Zamknij obrys (Enter)
            </button>
            <button type="button" onClick={() => setDraft((prev) => prev.slice(0, -1))} disabled={draft.length === 0} className={ui.btnSecondarySm}>
              Cofnij punkt
            </button>
            <button type="button" onClick={cancelDraw} className={ui.btnSecondarySm}>
              Anuluj (Esc)
            </button>
          </>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => zoom(1 / 1.4)} className={ui.iconBtn} aria-label="Przybliż">
            +
          </button>
          <button type="button" onClick={() => zoom(1.4)} className={ui.iconBtn} aria-label="Oddal">
            −
          </button>
          <button type="button" onClick={() => setView({ x: 0, y: 0, w: width, h: height })} className={ui.btnSecondarySm}>
            Cały plan
          </button>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const last = history.at(-1)!;
                setHistory((prev) => prev.slice(0, -1));
                onChange(last.index, last.polygon);
              }}
              className={ui.btnSecondarySm}
            >
              Cofnij (Ctrl+Z)
            </button>
          )}
        </span>
      </div>

      <div className="relative min-h-0 flex-1 bg-zinc-900">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          className={`h-full w-full touch-none select-none ${mode !== "edit" ? "cursor-crosshair" : panning ? "cursor-grabbing" : "cursor-grab"}`}
          onWheel={onWheel}
          onPointerDown={onBackgroundDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setCursor(null)}
        >
          <image href={image} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />

          {/* Pozostałe obrysy — klik wybiera lokal (gdy wolno) */}
          {shapes
            .filter((shape) => shape.index !== active)
            .map((shape) =>
              parsePolygon(shape.polygon).map((part, partIndex) => {
                const color = statusColor(shape.status);
                return (
                  <g key={`${shape.index}-${partIndex}`}>
                    <polygon
                      points={part.map((p) => p.join(",")).join(" ")}
                      fill={color}
                      fillOpacity={0.18}
                      stroke={color}
                      strokeOpacity={0.9}
                      strokeWidth={stroke * 0.75}
                      style={{ cursor: onActiveChange && mode === "edit" ? "pointer" : undefined }}
                      onPointerDown={(event) => {
                        if (mode !== "edit" || !onActiveChange) return;
                        event.stopPropagation();
                        onActiveChange(shape.index);
                      }}
                    />
                    {partIndex === 0 && (
                      <text x={center(part)[0]} y={center(part)[1]} textAnchor="middle" dominantBaseline="middle" fontSize={11 * unit()} fill="#fff" stroke="#000" strokeWidth={3 * unit()} paintOrder="stroke" pointerEvents="none">
                        {shape.label}
                      </text>
                    )}
                  </g>
                );
              })
            )}

          {/* Aktywny obrys: punkty do przeciągania, "+" na środku krawędzi */}
          {activeShape &&
            activeParts.map((part, partIndex) => (
              <g key={`active-${partIndex}`}>
                <polygon points={part.map((p) => p.join(",")).join(" ")} fill="#6366f1" fillOpacity={0.25} stroke="#a5b4fc" strokeWidth={stroke * 1.25} pointerEvents="none" />
                {partIndex === 0 && (
                  <text x={center(part)[0]} y={center(part)[1]} textAnchor="middle" dominantBaseline="middle" fontSize={13 * unit()} fontWeight={700} fill="#fff" stroke="#312e81" strokeWidth={3 * unit()} paintOrder="stroke" pointerEvents="none">
                    {activeShape.label}
                  </text>
                )}
                {mode === "edit" && part.map((point, vertexIndex) => {
                  const next = part[(vertexIndex + 1) % part.length];
                  const mid: Point = [(point[0] + next[0]) / 2, (point[1] + next[1]) / 2];
                  return (
                    <circle
                      key={`m${vertexIndex}`}
                      cx={mid[0]}
                      cy={mid[1]}
                      r={r * 0.75}
                      fill="#fff"
                      fillOpacity={0.55}
                      stroke="#6366f1"
                      strokeWidth={stroke * 0.6}
                      style={{ cursor: "copy" }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (active === null) return;
                        const parts = parsePolygon(activeShape.polygon);
                        parts[partIndex].splice(vertexIndex + 1, 0, [Math.round(mid[0]), Math.round(mid[1])]);
                        (event.target as Element).setPointerCapture?.(event.pointerId);
                        setDrag({ part: partIndex, vertex: vertexIndex + 1, parts });
                      }}
                    />
                  );
                })}
                {mode === "edit" && part.map((point, vertexIndex) => {
                  const isSelected = selectedVertex?.part === partIndex && selectedVertex.vertex === vertexIndex;
                  return (
                    <circle
                      key={`v${vertexIndex}`}
                      cx={point[0]}
                      cy={point[1]}
                      r={isSelected ? r * 1.3 : r}
                      fill={isSelected ? "#f43f5e" : "#fff"}
                      stroke="#4338ca"
                      strokeWidth={stroke}
                      style={{ cursor: "move" }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (event.altKey) {
                          removeVertex(partIndex, vertexIndex);
                          return;
                        }
                        setSelectedVertex({ part: partIndex, vertex: vertexIndex });
                        (event.target as Element).setPointerCapture?.(event.pointerId);
                        setDrag({ part: partIndex, vertex: vertexIndex, parts: parsePolygon(activeShape.polygon) });
                      }}
                    />
                  );
                })}
              </g>
            ))}

          {/* Rysowany obrys */}
          {mode !== "edit" && draft.length > 0 && (
            <g pointerEvents="none">
              <polyline points={[...draft, ...(cursor ? [cursor] : [])].map((p) => p.join(",")).join(" ")} fill="#6366f1" fillOpacity={0.15} stroke="#facc15" strokeWidth={stroke * 1.25} strokeDasharray={`${6 * unit()} ${4 * unit()}`} />
              {draft.map((point, index) => (
                <circle key={index} cx={point[0]} cy={point[1]} r={index === 0 ? r * 1.4 : r * 0.9} fill={index === 0 ? "#facc15" : "#fff"} stroke="#a16207" strokeWidth={stroke} />
              ))}
            </g>
          )}
          {snapPoint && <circle cx={snapPoint[0]} cy={snapPoint[1]} r={r * 1.8} fill="none" stroke="#22d3ee" strokeWidth={stroke} pointerEvents="none" />}
        </svg>

        {cursor && (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
            {Math.round(cursor[0])}, {Math.round(cursor[1])}
          </span>
        )}
      </div>

      <p className="border-t border-zinc-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
        {mode === "edit"
          ? "Przeciągnij punkt, aby go przesunąć · ⊕ na środku krawędzi dodaje punkt · Alt+klik na punkcie (albo zaznacz i Delete) usuwa · kółko myszy: zoom · przeciąganie tła: przesuwanie" +
            (onActiveChange ? " · klik w inny obrys: wybór lokalu" : "")
          : "Klikaj kolejne narożniki · klik w pierwszy (żółty) punkt albo Enter zamyka obrys · Backspace cofa punkt · punkty przyklejają się do narożników innych obrysów (Shift — bez przyklejania)"}
      </p>
    </div>
  );
}
