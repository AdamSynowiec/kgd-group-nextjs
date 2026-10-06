import { unwrap, type EditableValue } from "@/lib/editable";

type MarqueeFields = {
  items?: EditableValue<string[]> | string[];
};

/** Pas przewijanych słów kluczowych — czysto dekoracyjny, powtarza słowa z leadu Hero (bez nowej treści). */
export default function Marquee({ fields }: { fields: MarqueeFields }) {
  const items = unwrap(fields.items) ?? [];
  if (items.length === 0) return null;

  const loop = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-black/[0.06] bg-white py-5 font-ranade-variable">
      <div className="flex w-max animate-kgd-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center" aria-hidden={copy === 1}>
            {loop.map((item, index) => (
              <span key={`${copy}-${index}`} className="flex items-center text-[15px] md:text-[18px] text-black/60 whitespace-nowrap">
                <span className="px-6 md:px-10">{item}</span>
                <span className="text-[#C9AB8B]">◆</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
