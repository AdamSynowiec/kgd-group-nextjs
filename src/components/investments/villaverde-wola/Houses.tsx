"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type House = {
  unit: string;
  rooms: string;
  area: string;
  gardenArea?: string;
  pricePerM2: string;
  price: string;
  status: string;
  images?: string[];
};

type Labels = {
  mapAlt: string;
  area: string;
  rooms: string;
  garden: string;
  status: string;
  colUnit: string;
  colRooms: string;
  colArea: string;
  colPlotArea: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colDetails: string;
  seeMore: string;
  none: string;
  priceHistory: string;
  downloadStandard: string;
  downloadProspectus: string;
};

type HousesFields = {
  availableHeader?: EditableValue<string> | string;
  availableTagline?: EditableValue<string> | string;
  listHeader?: EditableValue<string> | string;
  listTagline?: EditableValue<string> | string;
  standardHeader?: EditableValue<string> | string;
  standardText?: EditableValue<string> | string;
  standardFile?: EditableValue<string> | string;
  prospectusHeader?: EditableValue<string> | string;
  prospectusText?: EditableValue<string> | string;
  prospectusFile?: EditableValue<string> | string;
  houses?: EditableValue<House[]> | House[];
  labels?: EditableValue<Labels> | Labels;
};

/** Współrzędne poligonów na obrazku rzutu domów — geometria konkretnego pliku graficznego, dopasowywana POZYCYJNIE (indeks w tablicy `houses`), dokładnie jak w oryginalnym Houses.jsx (`p.id === index`). */
const housesPoints: string[] = [
  "1614,986 1338,806 1346,745 1445,697 1456,704 1495,684 1564,725 1683,661 1831,740 1823,781 1843,795 1836,849 1615,986",
  "1172,696 961,558 962,504 987,494 986,473 1228,385 1310,426 1302,541 1230,571 1272,597 1267,652 1172,697",
  "821,463 766,429 763,393 727,372 729,325 764,314 762,265 851,239 996,316 996,406 824,466",
  "402,257 481,234 477,190 655,140 717,176 722,221 751,212 756,261 640,294 623,289 466,337 407,292 400,255",
  "133,373 410,296 463,333 470,391 452,395 510,440 516,489 412,520 356,477 207,523 159,482",
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

const isHidden = (status: string) => {
  const s = status?.toLowerCase();
  return s === "sprzedany" || s === "rezerwacja";
};

export default function Houses({ fields }: { fields: HousesFields }) {
  const availableHeader = unwrap(fields.availableHeader);
  const availableTagline = unwrap(fields.availableTagline);
  const listHeader = unwrap(fields.listHeader);
  const listTagline = unwrap(fields.listTagline);
  const standardHeader = unwrap(fields.standardHeader);
  const standardText = unwrap(fields.standardText);
  const standardFile = unwrap(fields.standardFile);
  const prospectusHeader = unwrap(fields.prospectusHeader);
  const prospectusText = unwrap(fields.prospectusText);
  const prospectusFile = unwrap(fields.prospectusFile);
  const houses = unwrap(fields.houses) ?? [];
  const labels = unwrap(fields.labels);

  const mappedHouses = houses.map((h, i) => ({ ...h, points: housesPoints[i] || null }));

  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
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

  if (!labels) return null;

  const hoveredHouse = mappedHouses.find((h) => h.unit === hoveredUnit) ?? null;

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

  return (
    <>
      <div className="py-[50px] lg:py-[100px] bg-[#1C1D21]">
        <div id="Plan Zagospodarowania" />
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div>
              <h2 className="text-white font-ebgaramond-regular text-[64px]">{availableHeader}</h2>
            </div>
            <div>
              <h3 className="text-[#C8A35F] font-ebgaramond-regular text-[32px] lg:text-[60px] lg:text-right">{availableTagline}</h3>
            </div>
          </div>
        </Container>
      </div>

      <div className="w-full flex justify-center relative">
        <img
          loading="lazy"
          decoding="async"
          ref={imgRef}
          src="/investments/villaverde-wola/houses-map.webp"
          alt={labels.mapAlt}
          className="max-w-full object-contain"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setImageSize({ width: naturalWidth, height: naturalHeight });
          }}
        />

        {imageSize.width > 0 && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}>
            {mappedHouses.map((house) => {
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
              {hoveredHouse.gardenArea && (
                <li>
                  {labels.garden}: {hoveredHouse.gardenArea}m<sup>2</sup>
                </li>
              )}
              <li>
                {labels.status}: <span className={getStatusTextColor(hoveredHouse.status)}>{hoveredHouse.status || "-"}</span>
              </li>
            </ul>
            {!isHidden(hoveredHouse.status) && (
              <div className="text-lg text-right mt-2">
                <strong>{hoveredHouse.price} zł</strong>
              </div>
            )}
            <div className="absolute w-[20px] h-[20px] bg-white -bottom-[10px] left-1/2 -ml-[10px] rotate-45 z-0" />
          </div>
        )}
      </div>

      <div>
        <div id="Oferta domów" />
        <div className="py-[50px] lg:py-[100px] bg-[#1C1D21]">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div>
                <h2 className="text-white font-ebgaramond-regular text-[64px]">{listHeader}</h2>
              </div>
              <div>
                <h3 className="text-[#C8A35F] font-ebgaramond-regular text-[32px] lg:text-[60px] lg:text-right">{listTagline}</h3>
              </div>
            </div>
          </Container>
        </div>

        <div className="bg-[#1C1D21] pb-[100px]">
          <div className="overflow-x-auto">
            <table className="text-nowrap min-w-full">
              <thead>
                <tr className="border-b border-[#4D4B4B] h-[100px] text-center text-[#C8A35F] font-ebgaramond-regular text-[18px] md:text-[24px]">
                  <th className="px-4">{labels.colUnit}</th>
                  <th className="px-4">{labels.colRooms}</th>
                  <th className="px-4">{labels.colArea}</th>
                  <th className="px-4">{labels.colPlotArea}</th>
                  <th className="px-4">{labels.colPricePerM2}</th>
                  <th className="px-4">{labels.colPrice}</th>
                  <th className="px-4">{labels.colStatus}</th>
                  <th className="px-4">{labels.colDetails}</th>
                </tr>
              </thead>
              <tbody>
                {mappedHouses.map((house) => (
                  <tr key={house.unit} className="border-b border-[#4D4B4B] h-[60px] md:h-[100px] text-center text-white font-ebgaramond-regular text-[18px] md:text-[24px]">
                    <td>{house.unit || "-"}</td>
                    <td>{house.rooms || "-"}</td>
                    <td>{house.area ? `${house.area} m²` : "-"}</td>
                    <td>{house.gardenArea ? `${house.gardenArea} m²` : "-"}</td>
                    <td>{!isHidden(house.status) ? `${house.pricePerM2 || "-"} zł` : ""}</td>
                    <td className="px-5">{!isHidden(house.status) ? `${house.price || "-"} zł` : ""}</td>
                    <td>
                      <span className={getStatusTextColor(house.status)}>{house.status || "-"}</span>
                    </td>
                    <td>
                      {!isHidden(house.status) ? (
                        (house.images?.length ?? 0) > 0 ? (
                          <span className="underline cursor-pointer hover:text-[#C8A35F]" onClick={() => setSelectedHouse(house)}>
                            {labels.seeMore}
                          </span>
                        ) : (
                          <span className="text-gray-500">{labels.none}</span>
                        )
                      ) : (
                        <div />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-4 pr-12 text-right">
            <Link href="historia-cen" className="text-white hover:underline">
              {labels.priceHistory}
            </Link>
          </div>
        </div>

        <div className="bg-[#FCFCFC] py-[50px] lg:py-[100px]">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="text-center border-b lg:border-b-0 lg:border-r border-[#ccc] pb-[32px] lg:pr-[32px]">
                <h2 className="text-[#C8A35F] font-ebgaramond-regular text-[32px] xl:text-[64px] mb-[20px]">{standardHeader}</h2>
                <p className="text-[#474747] font-ebgaramond-regular text-[26px] text-center mb-[20px] whitespace-pre-line">{standardText}</p>
                {standardFile && (
                  <a href={standardFile} target="_blank" rel="noreferrer" className="font-ebgaramond-regular text-[24px] lg:text-[28px] text-[#C8A35F] underline">
                    {labels.downloadStandard}
                  </a>
                )}
              </div>
              <div className="text-center lg:pl-[32px]">
                <h2 className="text-[#C8A35F] font-ebgaramond-regular text-[32px] xl:text-[64px] mb-[20px]">{prospectusHeader}</h2>
                <p className="text-[#474747] font-ebgaramond-regular text-[26px] text-center mb-[20px]">{prospectusText}</p>
                {prospectusFile && (
                  <a href={prospectusFile} target="_blank" rel="noreferrer" className="font-ebgaramond-regular text-[24px] lg:text-[28px] text-[#C8A35F] underline">
                    {labels.downloadProspectus}
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
      </div>
    </>
  );
}
