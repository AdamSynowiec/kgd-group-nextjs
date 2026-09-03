"use client";

import { useEffect, useRef, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Apartment = {
  unit: string;
  rooms: string;
  area: string;
  gardenArea?: string;
  pricePerM2: string;
  price: string;
  status: "Wolny" | "Rezerwacja" | "Sprzedany";
  images?: string[];
  pdfUrl?: string;
};

type Labels = {
  loading: string;
  mapAlt: string;
  listTitle: string;
  floorLabel: string;
  floorAll: string;
  floorA: string;
  floorB: string;
  statusLabel: string;
  statusAll: string;
  statusFree: string;
  statusReserved: string;
  statusSold: string;
  colUnit: string;
  colRooms: string;
  colArea: string;
  colGardenArea: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colDetails: string;
  area: string;
  gardenArea: string;
  rooms: string;
  seeMore: string;
  none: string;
  priceHistory: string;
  download: string;
};

type ApartamentsFields = {
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  apartments?: EditableValue<Apartment[]> | Apartment[];
  prospectusHeader?: EditableValue<string> | string;
  prospectusText?: EditableValue<string> | string;
  prospectusFile?: EditableValue<string> | string;
  standardHeader?: EditableValue<string> | string;
  standardText?: EditableValue<string> | string;
  standardFile?: EditableValue<string> | string;
  labels?: EditableValue<Labels> | Labels;
};

/**
 * Współrzędne poligonów na obrazku rzutu domów (rudava-park-wizualizacja-06.webp)
 * — geometria związana z konkretnym plikiem graficznym, nie treść CMS, więc
 * zostaje zaszyta w komponencie tak jak w oryginale.
 */
const housesPoints: { number: string[]; points: string }[] = [
  { number: ["M12A", "M12B"], points: "1714,1371 1915,1255 1911,1179 1879,1164 1879,1137 1864,1130 1845,1111 1845,993 1835,986 1797,967 1790,872 1780,857 1604,775 1401,851 1401,887 1411,895 1411,897 1333,931 1333,1075 1367,1094 1365,1179 1670,1365 1693,1357 1714,1374 " },
  { number: ["M11A", "M11B"], points: "2093,1143 2080,1134 2086,1024 2040,999 2036,933 2044,929 2046,893 1985,866 1979,819 1989,815 1987,787 1784,699 1615,773 1805,868 1799,976 1837,995 1852,1105 1890,1126 1888,1170 1911,1181 1915,1255 1979,1215 " },
  { number: ["M10A", "M10B"], points: "2569,895 2571,868 2558,866 2558,815 2535,809 2535,770 2508,760 2495,673 2455,652 2455,576 2260,508 2127,565 2129,589 2131,601 2063,633 2061,745 2095,758 2097,823 2453,957 2563,891 " },
  { number: ["M9A", "M9B"], points: "2622,859 2698,813 2664,792 2666,709 2624,692 2620,639 2630,633 2628,608 2577,586 2580,519 2385,462 2268,508 2459,574 2461,652 2505,669 2512,758 2550,766 2544,800 2537,809 2558,817 2558,845 2584,847 2618,861 2696,813 " },
  { number: ["M8A", "M8B"], points: "2883,656 2881,649 2783,623 2670,592 2673,557 2649,547 2649,503 2666,496 2670,496 2670,474 2660,472 2659,445 2749,406 2750,378 2736,373 2734,356 2826,314 3031,362 2945,404 2943,478 2919,496 2918,481 2870,507 2864,533 2881,535 2868,614 2885,617 2883,654 " },
  { number: ["M7A", "M7B"], points: "2868,509 2941,461 2945,400 3031,358 3254,410 3256,430 3239,441 3239,474 3269,485 3270,507 3269,593 3120,735 2881,661 2885,617 2870,610 2868,505" },
  { number: ["M6A", "M6B"], points: "537,1037 537,897 618,861 618,770 889,684 791,631 525,709 523,741 584,777 461,815 463,849 487,864 482,908 440,927 438,955 474,982 485,978 487,1012 535,1043 540,1035" },
  { number: ["M5A", "M5B"], points: "658,1130 688,1120 692,1158 709,1173 709,1077 1105,923 1109,921 1067,895 1064,866 1069,866 1071,832 1054,821 1009,804 1014,751 893,688 631,779 628,866 537,895 537,1035 656,1128 " },
  { number: ["M4A", "M4B"], points: "1113,787 1183,828 1191,798 1191,680 1202,675 1263,650 1263,576 1454,510 1348,464 1143,531 1145,553 1149,599 1094,620 1098,646 1115,656 1111,692 1075,711 1077,739 1115,758 1113,787 " },
  { number: ["M3A", "M3B"], points: "1187,842 1342,923 1407,893 1397,887 1399,849 1361,828 1653,707 1623,696 1623,663 1627,660 1627,633 1581,618 1583,559 1456,512 1261,580 1261,654 1193,677 1191,798 1189,840 " },
  { number: ["M2A", "M2B"], points: "1583,608 1631,631 1636,652 1659,671 1682,654 1682,517 1750,487 1748,430 1883,375 1778,341 1621,390 1621,409 1644,419 1642,445 1581,468 1583,493 1596,498 1591,540 1566,548 1587,559 1583,580 1583,610 " },
  { number: ["M1A", "M1B"], points: "1680,663 1828,715 1854,701 1849,637 2034,563 2031,512 2050,506 2055,502 2053,481 2015,464 2015,413 1883,373 1746,428 1750,493 1687,517 1684,614 1697,624 1682,682 " },
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
      return "rgba(255,0,0,0.5)";
    case "rezerwacja":
      return "rgba(255,165,0,0.5)";
    case "wolny":
      return "rgba(0,128,0,0.5)";
    default:
      return "rgba(31,61,48,0.5)";
  }
}

const isHiddenStatus = (status: string) => {
  const s = status?.toLowerCase();
  return s === "sprzedany" || s === "rezerwacja";
};

export default function Apartaments({ fields }: { fields: ApartamentsFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const apartments = unwrap(fields.apartments) ?? [];
  const prospectusHeader = unwrap(fields.prospectusHeader);
  const prospectusText = unwrap(fields.prospectusText);
  const prospectusFile = unwrap(fields.prospectusFile);
  const standardHeader = unwrap(fields.standardHeader);
  const standardText = unwrap(fields.standardText);
  const standardFile = unwrap(fields.standardFile);
  const labels = unwrap(fields.labels);

  const houses = apartments.map((apt) => {
    const pointData = housesPoints.find((p) => p.number.includes(apt.unit)) || null;
    return { ...apt, points: pointData?.points || null };
  });

  const [selectedHouse, setSelectedHouse] = useState<Apartment | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");

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
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setSelectedHouse(null);
    if (selectedHouse) window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [selectedHouse]);

  if (!labels) return null;

  return (
    <section className="bg-[#FCFCFC]">
      <Container>
        <div className="py-[50px] md:py-[100px]">
          <h2 className="font-ranade-variable text-[32px] md:text-[64px] mb-[24px]">{header}</h2>
          {subHeader && <p className="font-ranade-variable font-thin text-[18px] md:text-[24px]">{subHeader}</p>}
        </div>
      </Container>

      {/* MAPA */}
      <div className="w-full flex justify-center relative">
        <img
          loading="lazy"
          decoding="async"
          ref={imgRef}
          src="/investments/rudava-park/rudava-park-wizualizacja-06.webp"
          alt={labels.mapAlt}
          className="max-w-full object-contain"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setImageSize({ width: naturalWidth, height: naturalHeight });
          }}
        />

        {imageSize.width > 0 && (
          <svg className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}>
            {houses
              .filter((h) => statusFilter === "all" || h.status === statusFilter)
              .map((house) => {
                if (!house.points) return null;
                const [cx, cy] = getPolygonCenter(house.points);

                return (
                  <polygon
                    key={house.unit}
                    points={house.points}
                    fill={hoveredUnit === house.unit ? getStatusColorFill(house.status) : "transparent"}
                    stroke="rgba(31,61,48,0.5)"
                    style={{ cursor: "pointer", pointerEvents: "all" }}
                    onMouseEnter={() => {
                      setHoveredUnit(house.unit);
                      setTooltipPos({ x: cx, y: cy });
                    }}
                    onMouseMove={(e) => {
                      const rect = imgRef.current!.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
                      setTooltipPos({ x, y });
                    }}
                    onMouseLeave={() => setHoveredUnit(null)}
                  />
                );
              })}
          </svg>
        )}

        {hoveredUnit && (
          <div
            className="font-ebgaramond-regular bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-gray-100 min-w-[280px] relative"
            style={{ position: "absolute", left: tooltipPos.x, top: tooltipPos.y, transform: "translate(-50%, -100%)", pointerEvents: "none", zIndex: 50 }}
          >
            {(() => {
              const hovered = houses.find((h) => h.unit === hoveredUnit);
              if (!hovered) return null;
              const housesInPolygon = houses.filter((h) => h.points === hovered.points).reverse();

              const getStatusColor = (status: string) => {
                switch (status?.toLowerCase()) {
                  case "sprzedany":
                    return "bg-red-50 text-red-600";
                  case "rezerwacja":
                    return "bg-orange-50 text-orange-600";
                  case "wolny":
                    return "bg-green-50 text-green-600";
                  default:
                    return "bg-gray-50 text-gray-500";
                }
              };

              return housesInPolygon.map((house) => (
                <div key={house.unit} className="border-b border-gray-100 last:border-0">
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex justify-between items-center">
                      <strong className="text-lg text-gray-900 tracking-wide">{house.unit}</strong>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full tracking-wide ${getStatusColor(house.status)}`}>
                        {house.status || "-"}
                      </span>
                    </div>
                  </div>

                  <ul className="px-5 py-2 text-sm text-gray-600 space-y-1">
                    <li className="flex justify-between">
                      <span>{labels.area}</span>
                      <span className="font-medium text-gray-900">
                        {house.area} m<sup>2</sup>
                      </span>
                    </li>
                    {house.gardenArea && (
                      <li className="flex justify-between">
                        <span>{labels.gardenArea}</span>
                        <span className="font-medium text-gray-900">
                          {house.gardenArea} m<sup>2</sup>
                        </span>
                      </li>
                    )}
                    <li className="flex justify-between">
                      <span>{labels.rooms}</span>
                      <span className="font-medium text-gray-900">{house.rooms}</span>
                    </li>
                  </ul>

                  {!isHiddenStatus(house.status) && house.price !== "-" && (
                    <div className="px-5 pb-4 pt-1 text-right">
                      <span className="text-lg font-semibold text-gray-900">{house.price} zł</span>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* TABELA */}
      <Container>
        <div id="oferta" className="py-[50px] md:py-[100px]">
          <h2 className="font-ranade-variable text-[40px] md:text-[64px]">{labels.listTitle}</h2>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block mb-2 text-sm font-normal text-gray-700">{labels.floorLabel}</label>
              <select value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)} className="border-b-4 w-full sm:w-[200px] p-4">
                <option value="all">{labels.floorAll}</option>
                <option value="A">{labels.floorA}</option>
                <option value="B">{labels.floorB}</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-normal text-gray-700">{labels.statusLabel}</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border-b-4 w-full sm:w-[250px] p-4">
                <option value="all">{labels.statusAll}</option>
                <option value="Wolny">{labels.statusFree}</option>
                <option value="Rezerwacja">{labels.statusReserved}</option>
                <option value="Sprzedany">{labels.statusSold}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200">
            <table className="text-nowrap font-ranade-variable w-full text-left text-sm">
              <thead>
                <tr className="text-[16px] bg-[#1D1D1D] text-white h-[100px] text-center">
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
                {houses
                  .filter((h) => statusFilter === "all" || h.status === statusFilter)
                  .filter((h) => {
                    if (floorFilter === "all") return true;
                    if (floorFilter === "A") return h.unit.endsWith("A");
                    if (floorFilter === "B") return h.unit.endsWith("B");
                    return true;
                  })
                  .map((house, i) => (
                    <tr
                      key={house.unit}
                      className={`${i % 2 === 0 ? "bg-white hover:bg-[#FCFCFC]" : "bg-slate-50 hover:bg-slate-100"} text-[16px] border-t border-gray-100 text-center`}
                    >
                      <td className="h-[80px]">{house.unit}</td>
                      <td>{house.rooms}</td>
                      <td>{house.area} m²</td>
                      <td>{house.gardenArea ? `${house.gardenArea} m²` : "-"}</td>
                      <td>{!isHiddenStatus(house.status) && house.pricePerM2 !== "-" ? `${house.pricePerM2} zł` : "-"}</td>
                      <td>{!isHiddenStatus(house.status) && house.price !== "-" ? `${house.price} zł` : "-"}</td>
                      <td
                        className={
                          house.status === "Wolny"
                            ? "text-green-600"
                            : house.status === "Rezerwacja"
                              ? "text-orange-600"
                              : house.status === "Sprzedany"
                                ? "text-red-600"
                                : ""
                        }
                      >
                        {house.status}
                      </td>
                      <td>
                        {!isHiddenStatus(house.status) ? (
                          (house.images?.length ?? 0) > 0 ? (
                            <div className="flex items-center justify-center gap-3">
                              <span className="cursor-pointer underline hover:no-underline" onClick={() => setSelectedHouse(house)}>
                                {labels.seeMore}
                              </span>
                              {house.pdfUrl && (
                                <a href={house.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#1F3D30]" title="Pobierz PDF">
                                  PDF
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">{labels.none}</span>
                          )
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                <tr>
                  <td className="h-[80px] text-right pr-10" colSpan={7}>
                    <a href="historia-cen" className="hover:underline">
                      {labels.priceHistory}
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Container>

      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 pb-[50px] md:pb-[100px] gap-[24px]">
          <div className="p-[30px] border border-zinc-400">
            <h3 className="text-[32px] mb-[24px] text-[#3d3d3d]">{prospectusHeader}</h3>
            <p className="text-[18px]/[36px] mb-[24px] text-[#3d3d3d]">{prospectusText}</p>
            {prospectusFile && (
              <a href={prospectusFile} target="_blank" rel="noopener noreferrer" className="underline">
                {labels.download}
              </a>
            )}
          </div>
          <div className="p-[30px] border border-zinc-400">
            <h3 className="text-[32px] mb-[24px] text-[#3d3d3d]">{standardHeader}</h3>
            <p className="text-[18px]/[36px] mb-[24px] text-[#3d3d3d]">{standardText}</p>
            {standardFile && (
              <a href={standardFile} target="_blank" rel="noopener noreferrer" className="underline">
                {labels.download}
              </a>
            )}
          </div>
        </div>
      </Container>

      {selectedHouse && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full overflow-y-auto p-6">
            {(selectedHouse.images ?? []).map((img) => (
              <img loading="lazy" decoding="async" key={img} src={img} className="mb-6 max-w-full h-auto mx-auto" alt="" />
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
