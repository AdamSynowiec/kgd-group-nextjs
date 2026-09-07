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
  terraceArea?: string;
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
  terrace: string;
  colUnit: string;
  colRooms: string;
  colArea: string;
  colGardenArea: string;
  colTerraceArea: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colDetails: string;
  seeMore: string;
  none: string;
  priceHistory: string;
  download: string;
};

type OffertFields = {
  eyebrow?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  listEyebrow?: EditableValue<string> | string;
  listHeader?: EditableValue<string> | string;
  listText?: EditableValue<string> | string;
  listSubText?: EditableValue<string> | string;
  standardHeader?: EditableValue<string> | string;
  standardText?: EditableValue<string> | string;
  standardFile?: EditableValue<string> | string;
  prospectusHeader?: EditableValue<string> | string;
  prospectusText?: EditableValue<string> | string;
  prospectusFile?: EditableValue<string> | string;
  houses?: EditableValue<House[]> | House[];
  labels?: EditableValue<Labels> | Labels;
};

/** Współrzędne poligonów na obrazku rzutu domów — geometria konkretnego pliku graficznego, zaszyta jak w oryginale (Offert.jsx, housesPoints). */
const housesPoints: { number: string; points: string }[] = [
  { number: "M 8", points: "418,382 542,352 542,345 547,342 547,300 553,298 553,288 561,286 562,272 592,266 606,273 606,276 657,265 676,275 677,281 694,290 579,321 576,405 463,435 418,396 418,384" },
  { number: "M 7", points: "461,432 575,399 581,319 697,290 708,289 728,301 729,306 739,313 741,334 722,343 719,350 650,367 650,417 642,420 644,450 524,488 463,432" },
  { number: "M 6", points: "524,490 649,445 649,434 644,431 644,422 650,417 653,369 718,350 720,344 772,327 796,339 796,345 820,357 703,400 700,493 580,537 524,488" },
  { number: "M 5", points: "578,537 699,490 702,398 804,362 806,351 834,341 856,355 857,368 882,387 882,403 869,408 871,435 796,465 797,522 789,524 789,537 784,543 783,555 659,603 578,534" },
  { number: "M 4", points: "661,609 784,553 783,540 789,539 789,526 796,524 796,462 806,457 808,449 927,403 965,425 965,435 996,447 865,507 857,627 747,678 653,603" },
  { number: "M 3", points: "747,680 857,623 866,508 1001,448 1082,493 1081,512 1068,520 1068,573 1011,602 1014,680 1004,683 1006,707 876,788 747,675" },
  { number: "M 2", points: "450,1079 884,805 858,783 1000,698 1005,698 1005,684 1014,682 1010,605 1024,600 1028,587 1153,521 1227,552 1230,566 1259,582 1121,673 1119,828 785,1076 450,1076" },
  { number: "M 1", points: "815,1076 964,972 970,970 969,913 1059,845 1071,854 1117,817 1113,670 1118,664 1121,648 1257,570 1367,627 1366,637 1384,651 1385,661 1433,688 1433,698 1414,719 1420,765 1555,858 1322,1078 803,1078" },
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

export default function Offert({ fields }: { fields: OffertFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const listEyebrow = unwrap(fields.listEyebrow);
  const listHeader = unwrap(fields.listHeader);
  const listText = unwrap(fields.listText);
  const listSubText = unwrap(fields.listSubText);
  const standardHeader = unwrap(fields.standardHeader);
  const standardText = unwrap(fields.standardText);
  const standardFile = unwrap(fields.standardFile);
  const prospectusHeader = unwrap(fields.prospectusHeader);
  const prospectusText = unwrap(fields.prospectusText);
  const prospectusFile = unwrap(fields.prospectusFile);
  const houses = unwrap(fields.houses) ?? [];
  const labels = unwrap(fields.labels);

  const mappedHouses = houses.map((h) => {
    const pointData = housesPoints.find((p) => p.number === h.unit) || null;
    return { ...h, points: pointData?.points || null };
  });

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
    <section>
      <div className="bg-[#1C1D21]">
        <Container>
          <div className="py-[50px] md:py-[100px]">
            <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: false, amount: 0.3 }}>
              <span className="block text-[#FCFCFC] text-[18px] md:text-[24px] font-ranade-variable font-semibold">{eyebrow}</span>
              <h2 className="text-[#FCFCFC] text-[36px] md:text-[48px] font-ranade-variable">{header}</h2>
              <p className="text-[#FCFCFC] text-[18px] md:text-[24px] font-ranade-variable font-thin">{text}</p>
            </motion.p>
          </div>
        </Container>
      </div>

      <div className="w-full flex justify-center relative">
        <img
          loading="lazy"
          decoding="async"
          ref={imgRef}
          src="/investments/pylna-residence/offert-map.webp"
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
              {hoveredHouse.terraceArea && (
                <li>
                  {labels.terrace}: {hoveredHouse.terraceArea}m<sup>2</sup>
                </li>
              )}
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

      <div id="mieszkania" className="bg-[#1C1D21]">
        <Container>
          <div className="py-[50px] md:py-[100px]">
            <motion.p initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: false, amount: 0.3 }}>
              <span className="block text-[#FCFCFC] text-[18px] md:text-[24px] font-ranade-variable font-semibold">{listEyebrow}</span>
              <h2 className="text-[#FCFCFC] text-[36px] md:text-[48px] font-ranade-variable">{listHeader}</h2>
              <p className="text-[#FCFCFC] text-[18px] md:text-[24px] font-ranade-variable font-thin">
                {listText}
                <br />
                {listSubText}
              </p>
            </motion.p>
          </div>
        </Container>
      </div>

      <div className="overflow-x-auto">
        <table className="text-nowrap font-ranade-variable w-full text-left text-sm">
          <thead>
            <tr className="text-[16px] bg-[#1C1D21] text-white h-[100px] text-center">
              <th className="px-4">{labels.colUnit}</th>
              <th className="px-4">{labels.colRooms}</th>
              <th className="px-4">{labels.colArea}</th>
              <th className="px-4">{labels.colGardenArea}</th>
              <th className="px-4">{labels.colTerraceArea}</th>
              <th className="px-4">{labels.colPricePerM2}</th>
              <th className="px-4">{labels.colPrice}</th>
              <th className="px-4">{labels.colStatus}</th>
              <th className="px-4">{labels.colDetails}</th>
            </tr>
          </thead>

          <tbody>
            {mappedHouses.map((house) => (
              <tr key={house.unit} className="text-[16px] border-t border-gray-200 text-center">
                <td className="h-[80px]">{house.unit || "-"}</td>
                <td>{house.rooms || "-"}</td>
                <td>{house.area ? `${house.area} m²` : "-"}</td>
                <td>{house.gardenArea ? `${house.gardenArea} m²` : "-"}</td>
                <td>{house.terraceArea ? `${house.terraceArea} m²` : "-"}</td>
                <td>{!isHiddenStatus(house.status) ? (house.pricePerM2 === "-" ? "-" : `${house.pricePerM2} zł`) : ""}</td>
                <td>{!isHiddenStatus(house.status) ? (house.price ? `${house.price} zł` : "-") : ""}</td>
                <td>
                  <span className={getStatusTextColor(house.status)}>{house.status || "-"}</span>
                </td>
                <td>
                  {!isHiddenStatus(house.status) ? (
                    (house.images?.length ?? 0) > 0 ? (
                      <span className="underline cursor-pointer hover:text-[#C8A35F]" onClick={() => setSelectedHouse(house)}>
                        {labels.seeMore}
                      </span>
                    ) : (
                      <span className="text-gray-500">{labels.none}</span>
                    )
                  ) : (
                    <span className="text-gray-400 italic" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-[#1C1D21] text-right py-6 px-12">
        <Link href="historia-cen" className="underline text-white">
          {labels.priceHistory}
        </Link>
      </div>

      <div className="bg-[#1C1D21]">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
            <div className="text-center bg-[#1C1D21] pt-[50px]">
              <h3 className="text-[#fff] font-ranade-variable text-[24px] lg:text-[48px] mb-[24px]">{standardHeader}</h3>
              <p className="text-[#fff] font-ranade-variable font-thin text-[18px] lg:text-[18px] whitespace-pre-line">{standardText}</p>
              {standardFile && (
                <div className="mt-[24px]">
                  <a href={standardFile} target="_blank" rel="noreferrer" className="text-[#fff] font-ranade-variable hover:underline text-[18px]">
                    {labels.download}
                  </a>
                </div>
              )}
            </div>
            <div className="text-center bg-[#1C1D21] px-1 pt-[50px]">
              <h3 className="text-[#fff] font-ranade-variable text-[24px] lg:text-[48px] mb-[24px]">{prospectusHeader}</h3>
              <p className="text-[#fff] font-ranade-variable font-thin text-[18px] lg:text-[18px]">{prospectusText}</p>
              {prospectusFile && (
                <div className="mt-[24px]">
                  <a href={prospectusFile} target="_blank" rel="noreferrer" className="text-[#fff] font-ranade-variable hover:underline text-[18px]">
                    {labels.download}
                  </a>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {selectedHouse && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6">
          <div className="flex flex-col overflow-y-auto gap-4 max-w-[90%] max-h-[80vh]">
            {(selectedHouse.images ?? []).map((img) => (
              <img key={img} loading="lazy" decoding="async" src={img} alt={`Rzut ${selectedHouse.unit}`} className="max-h-full w-auto" />
            ))}
          </div>
          <button className="absolute top-[4%] right-[2%]" onClick={() => setSelectedHouse(null)} aria-label="Zamknij">
            <svg className="w-8 h-8 text-gray-800" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18 17.94 6M18 18 6.06 6" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
