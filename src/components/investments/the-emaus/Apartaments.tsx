"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";

type Apartment = {
  unit: string;
  isGarage?: boolean;
  rooms: string;
  area: string;
  garden: string;
  pricePerM2: string;
  price: string;
  status: string;
  images?: string[];
};

type Labels = {
  colUnit: string;
  colRooms: string;
  colArea: string;
  colGarden: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colDetails: string;
  seeMore: string;
  priceHistory: string;
};

type ApartamentsFields = {
  header?: EditableValue<string> | string;
  disclaimer1?: EditableValue<string> | string;
  disclaimer2?: EditableValue<string> | string;
  apartments?: EditableValue<Apartment[]> | Apartment[];
  labels?: EditableValue<Labels> | Labels;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Wolne":
      return "text-green-500";
    case "Sprzedane":
      return "text-red-500";
    default:
      return "text-orange-500";
  }
};

const isHiddenStatus = (status: string) => {
  const s = status?.toLowerCase();
  return s === "sprzedane" || s === "zarezerwowane";
};

export default function Apartaments({ fields }: { fields: ApartamentsFields }) {
  const header = unwrap(fields.header) ?? "";
  const disclaimer1 = unwrap(fields.disclaimer1) ?? "";
  const disclaimer2 = unwrap(fields.disclaimer2) ?? "";
  const apartments = unwrap(fields.apartments) ?? [];
  const labels = unwrap(fields.labels);

  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);

  useEffect(() => {
    document.body.style.overflow = selectedApartment ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedApartment]);

  if (!labels) return null;

  return (
    <section id="apartamenty">
      <div className="container max-w-[1596px] mx-auto px-6">
        <div className="grid grid-cols-12">
          <div className="col-span-12 py-12 md:py-16">
            <h2 className="font-poppins text-[#856F5B] text-4xl md:text-5xl lg:text-[65px] font-extralight mb-12 md:mb-24">{header}</h2>
            <div className="bg-[#856F5B] overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-[#C2A992] text-white font-poppins h-[95px]">
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colUnit}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colRooms}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colArea}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colGarden}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colPricePerM2}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colPrice}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colStatus}</th>
                    <th className="py-2 px-4 text-[18px] text-center border-b border-[#FAF2E9]">{labels.colDetails}</th>
                  </tr>
                </thead>
                <tbody>
                  {apartments.map((apt) => (
                    <tr key={apt.unit}>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D] h-[95px]">{apt.unit}</td>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "-" : apt.rooms}</td>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "-" : `${apt.area}m²`}</td>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "-" : `${apt.garden} m²`}</td>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "-" : `${apt.pricePerM2} zł`}</td>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D]">{isHiddenStatus(apt.status) ? "" : `${apt.price} zł`}</td>
                      <td className={`py-2 px-4 text-center border-b border-[#FAF2E9] ${getStatusColor(apt.status)}`}>{apt.status}</td>
                      <td className="py-2 px-4 text-center border-b border-[#FAF2E9] text-[#C9B29D]">
                        {!isHiddenStatus(apt.status) ? (
                          <span className="hover:underline cursor-pointer" onClick={() => setSelectedApartment(apt)}>
                            {labels.seeMore}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right bg-white pt-4 pr-2">
                <Link className="underline" href="historia-cen">
                  {labels.priceHistory}
                </Link>
                <p className="text-center text-slate-800 font-poppins font-light pb-[32px] md:pt-16">{disclaimer1}</p>
                <p className="text-center text-slate-800 font-poppins font-light pb-12">{disclaimer2}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedApartment && (
        <motion.div
          className="z-50 fixed inset-0 bg-white flex justify-center items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col items-center justify-center bg-white p-6 w-full h-full max-h-[90vh] overflow-auto"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            <div className="flex flex-col overflow-y-auto gap-4 max-w-[90%] max-h-[80vh]">
              {(selectedApartment.images ?? []).map((img) => (
                <img key={img} loading="lazy" decoding="async" src={img} alt={`Rzut ${selectedApartment.unit}`} className="max-h-full w-auto" />
              ))}
            </div>
            <button className="absolute top-[4%] right-[2%]" onClick={() => setSelectedApartment(null)} aria-label="Zamknij">
              <svg className="w-8 h-8 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18 17.94 6M18 18 6.06 6" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
