"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CARTO_VOYAGER_ATTRIBUTION, CARTO_VOYAGER_TILE_URL } from "@/lib/carto";
import { Icon } from "./icons";

export type MapPoint = { name: string; category: string; lat: number | string; lng: number | string; desc?: string };
export type MapCategory = { key: string; label: string; icon: string };

const num = (value: number | string) => (typeof value === "number" ? value : parseFloat(String(value).replace(",", ".")));

/** Złoty okrągły znacznik kategorii z ikoną liniową w środku. */
function poiIcon(category: MapCategory | undefined, active: boolean): L.DivIcon {
  const glyph = renderToStaticMarkup(<Icon name={category?.icon ?? "pin"} className="h-[18px] w-[18px]" strokeWidth={1.4} />);
  const size = active ? 46 : 38;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;display:grid;place-items:center;background:${active ? "linear-gradient(135deg,#F7F7F7,#BCC0C1)" : "rgba(11,12,10,.92)"};color:${active ? "#171A1C" : "#E7E7E7"};border:1.5px solid #BCC0C1;box-shadow:0 8px 24px -6px rgba(0,0,0,.8)${active ? ",0 0 0 6px rgba(188,192,193,.18)" : ""};transition:all .25s">${glyph}</div>`,
  });
}

/** Znacznik inwestycji: duża złota kropka z pulsującym pierścieniem. */
function homeIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [72, 72],
    iconAnchor: [36, 36],
    popupAnchor: [0, -30],
    html: `<div style="position:relative;width:72px;height:72px;display:grid;place-items:center">
      <span class="fh-motion" style="position:absolute;inset:14px;border-radius:9999px;background:rgba(188,192,193,.5);animation:fhPulse 2.4s ease-out infinite"></span>
      <span class="fh-motion" style="position:absolute;inset:14px;border-radius:9999px;background:rgba(188,192,193,.35);animation:fhPulse 2.4s ease-out 1.2s infinite"></span>
      <span style="position:relative;display:grid;place-items:center;width:40px;height:40px;border-radius:9999px;background:linear-gradient(135deg,#F7F7F7,#BCC0C1 55%,#555859);border:2px solid #171A1C;box-shadow:0 0 0 2px #E7E7E7,0 10px 30px rgba(0,0,0,.7);color:#171A1C;font-family:var(--dmserif-src),serif;font-weight:600;font-size:15px;letter-spacing:.04em">FH</span>
    </div>`,
  });
}

/** Płynny przelot kamery do wybranego punktu + otwarcie jego dymka. */
function FlyTo({ target, zoom, onArrive }: { target: [number, number] | null; zoom: number; onArrive: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target, Math.max(map.getZoom(), zoom), { duration: 1.1 });
    const timer = setTimeout(onArrive, 1150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

export default function MapView({
  center,
  zoom,
  points,
  categories,
  visible,
  focus,
  homeName,
}: {
  center: [number, number];
  zoom: number;
  points: MapPoint[];
  categories: MapCategory[];
  visible: Set<string>;
  focus: number | null;
  homeName: string;
}) {
  const [draggable] = useState(() => typeof window === "undefined" || window.innerWidth > 768);
  const markerRefs = useRef<Record<number, L.Marker | null>>({});
  const home = useMemo(() => homeIcon(), []);
  const byKey = useMemo(() => Object.fromEntries(categories.map((category) => [category.key, category])), [categories]);

  const focusTarget = focus !== null && points[focus] ? ([num(points[focus].lat), num(points[focus].lng)] as [number, number]) : null;

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} dragging={draggable} touchZoom doubleClickZoom zoomControl className="fh-map h-full w-full bg-[#171A1C]">
      <TileLayer url={CARTO_VOYAGER_TILE_URL} attribution={CARTO_VOYAGER_ATTRIBUTION} />

      <Circle center={center} radius={1000} pathOptions={{ color: "#BCC0C1", weight: 1, opacity: 0.55, fillColor: "#BCC0C1", fillOpacity: 0.06, dashArray: "4 8" }} />
      <Circle center={center} radius={3000} pathOptions={{ color: "#BCC0C1", weight: 1, opacity: 0.35, fillColor: "#BCC0C1", fillOpacity: 0.03, dashArray: "4 10" }} />

      <Marker position={center} icon={home} zIndexOffset={1000}>
        <Popup className="fh-popup">
          <strong>{homeName}</strong>
        </Popup>
      </Marker>

      {points.map((point, index) =>
        visible.has(point.category) ? (
          <Marker
            key={`${point.name}-${index}`}
            position={[num(point.lat), num(point.lng)]}
            icon={poiIcon(byKey[point.category], focus === index)}
            ref={(marker) => {
              markerRefs.current[index] = marker;
            }}
          >
            <Popup className="fh-popup">
              <strong>{point.name}</strong>
              {point.desc && <span>{point.desc}</span>}
            </Popup>
          </Marker>
        ) : null
      )}

      <FlyTo target={focusTarget} zoom={14} onArrive={() => focus !== null && markerRefs.current[focus]?.openPopup()} />
    </MapContainer>
  );
}
