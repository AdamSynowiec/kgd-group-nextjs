"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { name: string; position: [number, number]; type: string };

const ICON_BASE = "/investments/pod-stokiem-willa/poi";

const ICON_FILES: Record<string, string> = {
  sklep: "icon-shop.svg",
  restauracja: "icon-restaurant.svg",
  przedszkole: "icon-kindergarten.svg",
  piekarnia: "icon-shop.svg",
  przystanekAutobusowy: "icon-bus.svg",
  przystanekKolejowy: "icon-trainstation.svg",
  kopiecKościuszki: "icon-triangle.svg",
  weterynarz: "icon-vet.svg",
  parkDecjusza: "icon-park.svg",
  willaDecjusza: "icon-villa.svg",
  padelClub: "icon-drink.svg",
  kawiarnia: "icon-coffee.svg",
  szpital: "icon-hospital.svg",
  centrumZabaw: "icon-fun.svg",
  silownia: "icon-gym.svg",
  zoo: "icon-zoo.svg",
  szkola: "icon-school.svg",
  rower: "icon-bicycle.svg",
  d1000: "icon-1km.svg",
  d2000: "icon-2km.svg",
};

function buildIcons() {
  const icons: Record<string, L.Icon> = {
    inwestycja: L.icon({
      iconUrl: `${ICON_BASE}/pylna-residence-map-pin.svg`,
      iconSize: [120, 120],
      iconAnchor: [60, 120],
    }),
  };

  for (const [type, file] of Object.entries(ICON_FILES)) {
    const size: [number, number] = type === "d1000" || type === "d2000" ? [60, 60] : [30, 30];
    icons[type] = L.icon({
      iconUrl: `${ICON_BASE}/${file}`,
      iconSize: size,
      iconAnchor: [size[0] / 2, size[1]],
    });
  }

  return icons;
}

export default function MapView({ points, center }: { points: MapPoint[]; center: [number, number] }) {
  // Bezpieczne jako lazy initializer: ten komponent renderuje się wyłącznie
  // po stronie klienta (next/dynamic z ssr:false w Map.tsx).
  const [icons] = useState<Record<string, L.Icon>>(() => buildIcons());
  const [draggable] = useState(() => window.innerWidth > 768);

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom={false}
      dragging={draggable}
      touchZoom={true}
      doubleClickZoom={true}
      className="w-full h-full grayscale-[60%] brightness-[90%]"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/">Carto</a>' />

      <Circle center={center} radius={1000} pathOptions={{ color: "#557452ff", fillColor: "#557452ff", fillOpacity: 0.2, weight: 1 }} />
      <Circle center={center} radius={2000} pathOptions={{ color: "#557452ff", fillColor: "#557452ff", fillOpacity: 0.2, weight: 1 }} />

      {points.map((p, i) => (
        <Marker key={`${p.name}-${i}`} position={p.position} icon={icons[p.type] || icons.inwestycja}>
          <Popup>
            <strong>{p.name}</strong>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
