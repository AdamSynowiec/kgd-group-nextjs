"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import Header from "./Header";

type Apartment = {
  unit: string;
  rooms: string;
  area: string;
  gardenArea?: string;
  pricePerM2: string;
  price: string;
  status: string;
  images?: string[];
  pdfUrl?: string;
};

type Labels = {
  loading: string;
  mapAlt: string;
  area: string;
  rooms: string;
  gardenArea: string;
  status: string;
  colUnit: string;
  colRooms: string;
  colArea: string;
  colGardenArea: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colDetails: string;
  seeMore: string;
  none: string;
  priceHistory: string;
  download: string;
};

type ApartamentsFields = {
  offerHeader?: EditableValue<string> | string;
  downloadsHeader?: EditableValue<string> | string;
  apartments?: EditableValue<Apartment[]> | Apartment[];
  prospectusHeader?: EditableValue<string> | string;
  prospectusText?: EditableValue<string> | string;
  prospectusFile?: EditableValue<string> | string;
  standardHeader?: EditableValue<string> | string;
  standardText?: EditableValue<string> | string;
  standardFile?: EditableValue<string> | string;
  labels?: EditableValue<Labels> | Labels;
};

/** Współrzędne poligonów na obrazku rzutu domów — geometria konkretnego pliku graficznego, zaszyta jak w oryginale. */
const housesPoints: { number: string; points: string }[] = [
  { number: "M1B", points: "170,691 227,673 234,673 236,655 434,581 1214,652 1214,401 1199,395 1199,343 460,117 261,353 261,378 232,410 232,428 199,460 200,480 178,504 179,568 245,573 242,613 177,644 177,686 172,688" },
  { number: "M1A", points: "172,724 171,691 225,673 234,674 233,658 433,583 1211,657 1213,654 1215,822 1291,829 1291,882 626,968 311,875 285,879 233,866 234,857 246,850 245,725 173,723" },
  { number: "M2B", points: "1214,653 1213,362 1211,359 1213,317 1305,284 1654,413 1654,451 1681,462 1681,467 1680,526 1680,688 1328,654 1292,650 1213,654 1213,482" },
  { number: "M2A", points: "1216,652 1214,891 1564,848 1582,848 1573,693 1678,690 1330,654 1291,649 1214,652" },
];

function getPolygonCenter(points: string): [number, number] {
  if (!points) return [0, 0];
  const pts = points.trim().split(" ").map((p) => p.split(",").map(Number));
  const sum = pts.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / pts.length, sum[1] / pts.length];
}

function getStatusColorFill(status: string) {
  switch (status?.toLowerCase()) {
    case "sprzedany":
      return "rgba(255, 0, 0, 0.5)";
    case "rezerwacja":
      return "rgba(255, 165, 0, 0.5)";
    case "wolny":
      return "rgba(0, 128, 0, 0.5)";
    default:
      return "rgba(31, 61, 48, 0.5)";
  }
}

function getStatusTextColor(status: string) {
  switch (status?.toLowerCase()) {
    case "sprzedany":
      return "text-red-600";
    case "rezerwacja":
      return "text-orange-500";
    case "wolny":
      return "text-green-600";
    default:
      return "text-gray-400";
  }
}

const isHiddenStatus = (status: string) => {
  const s = status?.toLowerCase();
  return s === "sprzedany" || s === "rezerwacja";
};

export default function Apartaments({ fields }: { fields: ApartamentsFields }) {
  const offerHeader = unwrap(fields.offerHeader);
  const downloadsHeader = unwrap(fields.downloadsHeader);
  const apartments = unwrap(fields.apartments) ?? [];
  const prospectusHeader = unwrap(fields.prospectusHeader);
  const prospectusText = unwrap(fields.prospectusText);
  const prospectusFile = unwrap(fields.prospectusFile);
  const standardHeader = unwrap(fields.standardHeader);
  const standardText = unwrap(fields.standardText);
  const standardFile = unwrap(fields.standardFile);
  const labels = unwrap(fields.labels);

  const houses = apartments.map((apt) => {
    const pointData = housesPoints.find((p) => p.number === apt.unit) || null;
    return { ...apt, points: pointData?.points || null };
  });

  const [selectedHouse, setSelectedHouse] = useState<Apartment | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const handleScroll = () => setHoveredUnit(null);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = selectedHouse ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedHouse]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setSelectedHouse(null);
    if (selectedHouse) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedHouse]);

  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    left: tooltipPos.x,
    top: tooltipPos.y - 10,
    background: "rgba(255, 255, 255, 1)",
    color: "black",
    padding: "8px 12px",
    pointerEvents: "none",
    whiteSpace: "pre-line",
    transform: "translate(-50%, -150%)",
    zIndex: 10,
  };

  if (!labels) return null;

  const hoveredHouse = houses.find((h) => h.unit === hoveredUnit) ?? null;

  return (
    <section className="bg-[#FCFCFC]">
      <div className="w-full flex justify-center relative">
        <img
          loading="lazy"
          decoding="async"
          ref={imgRef}
          src="/investments/pod-stokiem-apartamenty/vis/pod-stokiem-apartamenty-01.webp"
          alt={labels.mapAlt}
          className="max-w-full object-contain"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setImageSize({ width: naturalWidth, height: naturalHeight });
          }}
        />

        {imageSize.width > 0 && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}>
            {houses.map((house) => {
              if (!house.points) return null;
              const [cx, cy] = getPolygonCenter(house.points);

              return (
                <motion.polygon
                  whileTap={{ scale: 0.98, opacity: 0.8 }}
                  key={house.unit}
                  points={house.points}
                  fill={hoveredUnit === house.unit ? getStatusColorFill(house.status) : "transparent"}
                  stroke="rgba(31,61,48,0.5)"
                  style={{ cursor: "pointer", pointerEvents: "all", transition: "fill 0.2s ease" }}
                  onMouseEnter={() => {
                    setHoveredUnit(house.unit);
                    const svgRect = imgRef.current?.getBoundingClientRect();
                    if (!svgRect) return;
                    const scaleX = svgRect.width / imageSize.width;
                    const scaleY = svgRect.height / imageSize.height;
                    setTooltipPos({ x: cx * scaleX + svgRect.left, y: cy * scaleY + svgRect.top });
                  }}
                  onMouseLeave={() => setHoveredUnit(null)}
                  onClick={() => setSelectedHouse(house)}
                />
              );
            })}
          </svg>
        )}

        {hoveredHouse && (
          <div className="font-ebgaramond-regular" style={tooltipStyle}>
            <div>
              <strong>{hoveredHouse.unit}</strong>
            </div>
            <ul>
              <li>
                {labels.area}: {hoveredHouse.area}m<sup>2</sup>
              </li>
              <li>
                {labels.rooms}: {hoveredHouse.rooms}
              </li>
              <li>
                {labels.gardenArea}: {hoveredHouse.gardenArea}m<sup>2</sup>
              </li>
              <li>
                {labels.status}: <span className={getStatusTextColor(hoveredHouse.status)}>{hoveredHouse.status || "-"}</span>
              </li>
            </ul>
            {!isHiddenStatus(hoveredHouse.status) && (
              <div className="text-lg text-right mt-2">
                <strong>{hoveredHouse.price} zł</strong>
              </div>
            )}
            <div className="absolute w-[20px] h-[20px] bg-white -bottom-[10px] left-1/2 -ml-[10px] rotate-45 z-0" />
          </div>
        )}
      </div>

      <div id="oferta">
        <Header heading={offerHeader} />

        <div className="overflow-x-auto">
          <table className="text-nowrap font-libre-caslon text-[#3d3d3d] w-full text-left text-sm">
            <thead>
              <tr className="text-[16px] bg-[#1C272F] border-t border-[#193130] text-[#F5F5F5] h-[100px] text-center">
                <th className="px-4">{labels.colUnit}</th>
                <th className="px-4">{labels.colRooms}</th>
                <th className="px-4">{labels.colArea}</th>
                <th className="px-4">{labels.colGardenArea}</th>
                <th className="px-4">{labels.colPricePerM2}</th>
                <th className="px-4">{labels.colPrice}</th>
                <th className="px-4">{labels.colStatus}</th>
                <th className="px-4">{labels.colDetails}</th>
              </tr>
            </thead>

            <tbody>
              {houses.map((house) => (
                <tr key={house.unit} className="text-[16px] border-t border-gray-200 text-center">
                  <td className="h-[80px]">{house.unit || "-"}</td>
                  <td>{house.rooms || "-"}</td>
                  <td>{house.area ? `${house.area} m²` : "-"}</td>
                  <td>{house.gardenArea ? `${house.gardenArea}m²` : "-"}</td>
                  <td>{!isHiddenStatus(house.status) ? (house.pricePerM2 === "-" ? "-" : `${house.pricePerM2} zł`) : ""}</td>
                  <td className="px-5">{!isHiddenStatus(house.status) ? (house.price ? `${house.price} zł` : "-") : ""}</td>
                  <td>
                    <span className={getStatusTextColor(house.status)}>{house.status || "-"}</span>
                  </td>
                  <td>
                    {!isHiddenStatus(house.status) ? (
                      <div className="flex items-center justify-center gap-3">
                        {(house.images?.length ?? 0) > 0 ? (
                          <span className="underline cursor-pointer hover:text-[#C8A35F]" onClick={() => setSelectedHouse(house)}>
                            {labels.seeMore}
                          </span>
                        ) : (
                          <span className="text-gray-500">{labels.none}</span>
                        )}

                        {house.pdfUrl && (
                          <a href={house.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-black" title="Pobierz PDF">
                            PDF
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic" />
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} className="h-[80px] text-[16px] border-t border-gray-200 text-center">
                  <Link href="historia-cen" className="hover:underline">
                    {labels.priceHistory}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Header heading={downloadsHeader} />
      <div className="bg-[#F5F5F5]">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 py-[50px] md:py-[100px]">
            <div className="p-[30px]">
              <h3 className="text-[32px] mb-[24px] font-libre-caslon text-[#3d3d3d]">{prospectusHeader}</h3>
              <p className="text-[18px]/[36px] mb-[24px] font-libre-caslon text-[#3d3d3d]">{prospectusText}</p>
              {prospectusFile && (
                <a href={prospectusFile} target="_blank" rel="noreferrer" className="underline">
                  {labels.download}
                </a>
              )}
            </div>
            <div className="p-[30px]">
              <h3 className="text-[32px] mb-[24px] font-libre-caslon text-[#3d3d3d]">{standardHeader}</h3>
              <p className="text-[18px]/[36px] mb-[24px] font-libre-caslon text-[#3d3d3d]">{standardText}</p>
              {standardFile && (
                <a href={standardFile} target="_blank" rel="noreferrer" className="underline">
                  {labels.download}
                </a>
              )}
            </div>
          </div>
        </Container>
      </div>

      {selectedHouse && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full overflow-y-auto p-6">
            {(selectedHouse.images ?? []).map((img) => (
              <img key={img} src={img} loading="lazy" decoding="async" fetchPriority="high" className="mb-6 max-w-full h-auto mx-auto" alt="" />
            ))}
          </div>

          <button className="cursor-pointer fixed top-0 right-0 z-50" onClick={() => setSelectedHouse(null)} aria-label="Zamknij">
            <svg className="w-[3vw] h-[3vw]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" fill="white" />
              <path d="M7 17L16.8995 7.10051" stroke="#1d1d1d" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 7.00001L16.8995 16.8995" stroke="#1d1d1d" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
