"use client";

import { useState } from "react";
import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";

type ApartmentImage = { url: string; title?: string };

type ApartmentUnit = {
  unit: string;
  rooms: string;
  area: string;
  garden: string;
  terrace: string;
  pricePerM2: string;
  price: string;
  status: string;
  pdfUrl?: string;
  prospectusUrl?: string;
  finishStandardUrl?: string;
  images?: ApartmentImage[];
};

type Labels = {
  loading: string;
  colUnit: string;
  colRooms: string;
  colArea: string;
  colGarden: string;
  colTerrace: string;
  colPricePerM2: string;
  colPrice: string;
  colStatus: string;
  colGallery: string;
  colDocuments: string;
  seeMore: string;
  unitCard: string;
  prospectus: string;
  priceHistory: string;
  downloadStandard: string;
  gallery: string;
  close: string;
};

type OffertFields = {
  header: EditableValue<string> | string;
  standardEyebrow?: EditableValue<string> | string;
  standardHeader?: EditableValue<string> | string;
  standardText?: EditableValue<string> | string;
  apartments?: EditableValue<ApartmentUnit[]> | ApartmentUnit[];
  labels?: EditableValue<Labels> | Labels;
};

const statusStyles: Record<string, string> = {
  Wolny: "text-[#7c8c65]",
  Wolne: "text-[#7c8c65]",
  Rezerwacja: "text-[#b39b6a]",
  Sprzedany: "text-black/30 line-through",
  Sprzedane: "text-black/30 line-through",
};

function Status({ status }: { status: string }) {
  return <span className={`uppercase tracking-[0.25em] text-[10px] ${statusStyles[status] || ""}`}>{status}</span>;
}

function IconGallery() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function Offert({ fields }: { fields: OffertFields }) {
  const header = unwrap(fields.header);
  const standardEyebrow = unwrap(fields.standardEyebrow);
  const standardHeader = unwrap(fields.standardHeader);
  const standardText = unwrap(fields.standardText);
  const apartments = unwrap(fields.apartments) ?? [];
  const labels = unwrap(fields.labels);

  const [gallery, setGallery] = useState<ApartmentImage[]>([]);

  if (!labels) return null;

  const finishStandardUrl = apartments.find((a) => a.finishStandardUrl)?.finishStandardUrl;

  return (
    <>
      <section id="apartamenty" className="bg-[#f6f5f2] text-[#1a1a1a]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <h2 className="text-4xl md:text-6xl font-extralight font-serif">{header}</h2>

          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="text-center text-[11px] uppercase tracking-[0.25em] text-white bg-[#7c8c65] whitespace-nowrap">
                  <th className="py-4 px-4">{labels.colUnit}</th>
                  <th className="py-4 px-4">{labels.colRooms}</th>
                  <th className="py-4 px-4">{labels.colArea}</th>
                  <th className="py-4 px-4">{labels.colGarden}</th>
                  <th className="py-4 px-4">{labels.colTerrace}</th>
                  <th className="py-4 px-4">{labels.colPricePerM2}</th>
                  <th className="py-4 px-4">{labels.colPrice}</th>
                  <th className="py-4 px-4">{labels.colStatus}</th>
                  <th className="py-4 px-4">{labels.colGallery}</th>
                  <th className="py-4 px-4">{labels.colDocuments}</th>
                </tr>
              </thead>

              <tbody>
                {apartments.map((item) => (
                  <tr key={item.unit} className="text-center border-b border-black/10 whitespace-nowrap">
                    <td className="py-5 px-4">{item.unit}</td>
                    <td className="py-5 px-4">{item.rooms}</td>
                    <td className="py-5 px-4">{item.area}</td>
                    <td className="py-5 px-4">{item.garden}</td>
                    <td className="py-5 px-4">{item.terrace}</td>
                    <td className="py-5 px-4">{item.pricePerM2}</td>
                    <td className="py-5 px-4">{item.price}</td>
                    <td className="py-5 px-4">
                      <Status status={item.status} />
                    </td>
                    <td className="py-5 px-4 text-[11px] uppercase tracking-[0.15em]">
                      {(item.images?.length ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setGallery(item.images ?? [])}
                          className="cursor-pointer flex items-center justify-center w-full gap-2 text-[#7c8c65] hover:underline text-left"
                        >
                          <IconGallery /> <span>{labels.seeMore}</span>
                        </button>
                      )}
                    </td>

                    <td className="py-5 px-4 space-y-1 flex flex-col text-[11px] uppercase tracking-[0.15em]">
                      {item.pdfUrl && (
                        <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="text-[#7c8c65] hover:underline">
                          {labels.unitCard}
                        </a>
                      )}
                      {item.prospectusUrl && (
                        <a href={item.prospectusUrl} target="_blank" rel="noreferrer" className="text-[#7c8c65] hover:underline">
                          {labels.prospectus}
                        </a>
                      )}
                      {!item.pdfUrl && !item.prospectusUrl && !item.finishStandardUrl && !(item.images?.length ?? 0) && "-"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={10} className="py-4 px-4 text-center text-sm text-black/50">
                    <Link href="historia-cen" className="text-[#7c8c65] hover:underline">
                      {labels.priceHistory}
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <section className="relative bg-[#fdfcf9] text-[#1a1a1a]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,140,101,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-[#f6f5f2]/40" />

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 lg:py-28">
            <div className="max-w-3xl">
              {standardEyebrow && <p className="uppercase tracking-[0.45em] text-[11px] text-[#7c8c65]">{standardEyebrow}</p>}

              <h2 className="mt-6 text-4xl md:text-6xl font-extralight font-serif">{standardHeader}</h2>

              <div className="w-24 h-[1px] bg-[#7c8c65]/40 mt-8 mb-10" />

              {standardText && <p className="text-black/60 leading-[1.9] text-[15px] md:text-[16px] font-light">{standardText}</p>}

              {finishStandardUrl && (
                <a
                  href={finishStandardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-10 inline-flex px-6 py-3 bg-[#7c8c65] text-white uppercase tracking-[0.2em] text-[11px]"
                >
                  {labels.downloadStandard}
                </a>
              )}
            </div>
          </div>
        </section>
      </section>

      {gallery.length > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/95 overflow-y-auto" onClick={() => setGallery([])}>
          <div className="sticky top-0 z-20 flex justify-between items-center px-6 py-5 bg-black/60 backdrop-blur-md">
            <div className="text-white/40 uppercase tracking-[0.35em] text-[11px]">{labels.gallery}</div>

            <button
              onClick={() => setGallery([])}
              className="text-white/70 hover:text-white border border-white/10 px-5 py-2 text-[11px] uppercase tracking-[0.25em] hover:bg-white/10 transition"
            >
              {labels.close}
            </button>
          </div>

          <div className="space-y-16 py-12 px-4 sm:px-8 md:px-16 lg:px-24">
            {gallery.map((img) => (
              <div key={img.url} className="w-full flex justify-center">
                <div className="w-full max-w-6xl bg-black border border-white/10 rounded-[28px] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
                  <div className="w-full flex justify-center bg-black">
                    <img loading="lazy" decoding="async" src={img.url} alt={img.title || ""} className="w-full h-auto object-contain block" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
