import type { ReactNode } from "react";

/**
 * Edytorialny nagłówek sekcji (jak w /wykonczenie-pod-klucz): złota kreska,
 * opcjonalny nadtytuł, duży nagłówek Ranade wyrównany do lewej i lead obok.
 */
export default function SectionHeading({ eyebrow, header, text, children }: { eyebrow?: string; header?: string; text?: string; children?: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <span className="block h-[3px] w-14 bg-[#C9AB8B]" />
        {eyebrow && <span className="mt-6 block text-[12px] uppercase tracking-[0.25em] text-[#C9AB8B]">{eyebrow}</span>}
        <h2 className="mt-5 font-ranade-variable font-light text-[30px] md:text-[48px] leading-[1.1]">{header}</h2>
      </div>
      {(text || children) && (
        <div className="lg:col-span-5">
          {text && <p className="text-[16px] md:text-[17px] font-light leading-relaxed text-[#6b6b6b]">{text}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
