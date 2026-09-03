import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";

type DeweloperFields = {
  header: EditableValue<string> | string;
  aboutKGD: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
};

/** Naprawdę globalna sekcja (identyczna w każdej inwestycji) — patrz AGENTS.md, wyjątek dla Footer/Contact/Deweloper. */
export default function Deweloper({ fields }: { fields: DeweloperFields }) {
  const header = unwrap(fields.header);
  const aboutKGD = unwrap(fields.aboutKGD);
  const buttonLabel = unwrap(fields.buttonLabel);

  return (
    <section className="py-16 md:py-20 font-poppins">
      <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-10">
        <div className="flex justify-center md:justify-end">
          <div className="w-full max-w-[768px] px-4 md:px-6">
            <h2 className="text-[#1D1D1D] text-2xl md:text-3xl font-semibold mb-6">{header}</h2>

            <p className="font-light text-gray-600 mb-8 md:mb-10 text-[16px] md:text-[19px] leading-relaxed md:leading-[36px]">
              {aboutKGD}
            </p>

            {buttonLabel && (
              <Link
                href="/#kontakt"
                className="w-full md:w-auto group inline-flex items-center justify-center px-5 md:px-6 py-3 rounded-full font-light tracking-wide bg-[#C9AB8B] text-white border border-[#C9AB8B] transition-all duration-300 hover:bg-transparent hover:text-[#C9AB8B] hover:shadow-[0_10px_30px_rgba(201,171,139,0.25)] text-center text-sm md:text-base"
              >
                {buttonLabel}
              </Link>
            )}
          </div>
        </div>

        <div className="flex justify-center md:justify-start">
          <img
            loading="lazy"
            decoding="async"
            src="/investments/shared/kgd-wiz.webp"
            alt="KGD wizualizacja"
            className="w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
}
