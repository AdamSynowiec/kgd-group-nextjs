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
  pdfUrl?: string;
};

type Labels = {
  colUnit: string;
  colRooms: string;
  colArea: string;
  colGarden: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colGallery: string;
  colDocuments: string;
  seeMore: string;
  unitCard: string;
  priceHistory: string;
};

type ApartamentsFields = {
  header?: EditableValue<string> | string;
  disclaimer1?: EditableValue<string> | string;
  disclaimer2?: EditableValue<string> | string;
  apartments?: EditableValue<Apartment[]> | Apartment[];
  labels?: EditableValue<Labels> | Labels;
};

const IconGallery = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
  </svg>
);

const getStatusColor = (status: string) => {
  switch (status) {
    case "Wolny":
      return "text-green-500";
    case "Zarezerwowany":
      return "text-yellow-500";
    default:
      return "text-red-300";
  }
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
      <div className="relative">
        <div className="grid grid-cols-12 w-full h-full absolute -z-10">
          <div className="col-span-12 bg-[#FAF2E9]" />
        </div>
        <div className="container max-w-[1596px] mx-auto px-6">
          <div className="grid grid-cols-12">
            <div className="col-span-12 py-12 md:py-16">
              <h2 className="font-poppins text-[#856F5B] text-4xl md:text-5xl lg:text-[65px] font-extralight mb-12 md:mb-24">{header}</h2>
              <div className="bg-[#856F5B]">
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr className="bg-[#C2A992] text-white font-poppins h-[70px] uppercase tracking-[0.5px]">
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colUnit}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colRooms}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colArea}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colGarden}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">
                          {labels.colPricePerM2}
                          <sup>2</sup>
                        </th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colPrice}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colStatus}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colGallery}</th>
                        <th className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] font-normal">{labels.colDocuments}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apartments.map((apt) => (
                        <tr key={apt.unit}>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D] h-[70px]">{apt.unit}</td>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "-" : apt.rooms}</td>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.area}</td>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "-" : apt.garden}</td>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">{apt.isGarage ? "" : `${apt.pricePerM2} zł`}</td>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">{`${apt.price} zł`}</td>
                          <td className={`py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] ${getStatusColor(apt.status)}`}>{apt.status}</td>
                          <td className="py-2 px-4 text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">
                            <span
                              className="flex flex-row items-center justify-center gap-4 hover:underline cursor-pointer"
                              onClick={() => setSelectedApartment(apt)}
                            >
                              <IconGallery /> {labels.seeMore}
                            </span>
                          </td>
                          <td className="text-[15px] text-center border-b border-[#FAF2E9] text-[#C9B29D]">
                            {apt.pdfUrl ? (
                              <a
                                href={apt.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="no-underline hover:underline py-5 px-4 space-y-1 flex flex-col text-[15px] uppercase"
                              >
                                {labels.unitCard}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="grid-cols-12">
            <div className="flex flex-row gap-4 items-center justify-end text-center mx-auto pb-12">
              <Link href="historia-cen" className="font-poppins font-extralight text-[15px] text-[#696969] underline hover:no-underline">
                {labels.priceHistory}
              </Link>
            </div>
            <p className="text-center text-slate-800 font-poppins font-light pb-6 md:pb-[32px]">{disclaimer1}</p>
            <p className="text-center text-slate-800 font-poppins font-light pb-12 md:pb-16">{disclaimer2}</p>
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
