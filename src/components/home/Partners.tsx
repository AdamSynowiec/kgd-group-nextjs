"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

export type PartnerItem = { header: string; description: string; footer?: string; image?: string };
export type PartnerCategory = { name: string; icon?: string; items: PartnerItem[] };

export default function Partners({ eyebrow, header, text, categories }: { eyebrow: string; header: string; text: string; categories: PartnerCategory[] }) {
  const [activeCategory, setActiveCategory] = useState(() => categories[0]?.name ?? "");

  const activeItems = useMemo(() => categories.find((c) => c.name === activeCategory)?.items ?? [], [categories, activeCategory]);

  if (categories.length === 0) return null;

  return (
    <section id="sponsoring" className="py-12 md:py-16 bg-[#fdfdfd]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mb-8 md:mb-14">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-gray-400">{eyebrow}</p>
          <h2 className="text-2xl md:text-5xl font-semibold text-[#1D1D1D] mt-3 md:mt-4">{header}</h2>
          <p className="text-sm md:text-base text-gray-600 mt-3 md:mt-5 leading-relaxed">{text}</p>
        </div>

        <div className="mb-8 md:mb-14">
          <div className="flex md:grid gap-2 md:gap-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border border-gray-200 bg-white" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex-shrink-0 md:flex-shrink min-w-[140px] md:min-w-0 h-20 md:h-28 flex items-center justify-center relative text-sm transition-colors border-r border-gray-200 last:border-r-0 ${isActive ? "bg-[#fdfdfd]" : "bg-white hover:bg-[#fafafa]"}`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-[2px] transition-colors ${isActive ? "bg-[#c9ab8b]" : "bg-transparent"}`} />

                  <div className="flex flex-col items-center gap-2 px-2 text-center">
                    {cat.icon && (
                      <img src={cat.icon} alt={cat.name} loading="lazy" decoding="async" className={`w-10 h-10 md:w-12 md:h-12 object-contain ${isActive ? "opacity-90" : "opacity-60"}`} />
                    )}
                    <span className={`text-xs md:text-sm ${isActive ? "text-[#c9ab8b] font-semibold" : "text-[#352c2c]"}`}>{cat.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
          {activeItems.map((item) => (
            <motion.article
              key={item.header}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col md:flex-row border border-gray-200 bg-white overflow-hidden"
            >
              {item.image && (
                <div className="relative w-full md:w-[260px] flex items-center justify-center p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-white overflow-hidden">
                  <div className="absolute inset-0 bg-center bg-cover scale-110 blur-xl" style={{ backgroundImage: `url(${item.image})` }} />
                  <div className="absolute inset-0 bg-white/60" />
                  <img src={item.image} alt={item.header} loading="lazy" decoding="async" className="relative z-10 max-h-[120px] md:max-h-[160px] max-w-[80%] object-contain" />
                </div>
              )}

              <div className="flex-1 p-5 md:p-8">
                <h3 className="text-base md:text-xl font-semibold text-[#1D1D1D]">{item.header}</h3>
                <div className="w-10 h-[1px] bg-gray-300 my-3 md:my-4" />
                <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                {item.footer && <p className="text-xs text-gray-400 mt-5 md:mt-6">{item.footer}</p>}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
