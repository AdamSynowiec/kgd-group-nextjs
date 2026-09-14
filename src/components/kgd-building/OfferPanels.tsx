import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";

type Panel = { bg: string; header: string; text: string; link: string };

type OfferPanelsFields = {
  eyebrow?: EditableValue<string> | string;
  buttonLabel?: EditableValue<string> | string;
  panels?: EditableValue<Panel[]> | Panel[];
};

/**
 * Mirror starego HomePage.jsx (szablon "kgd-building", sekcja "HomePage") —
 * nazwa zmieniona na "OfferPanels", bo "HomePage" myliłoby się z faktyczną
 * stroną główną serwisu ("/"). Jedyna sekcja strony "/kgd-building".
 */
export default function OfferPanels({ fields }: { fields: OfferPanelsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const buttonLabel = unwrap(fields.buttonLabel);
  const panels = unwrap(fields.panels) ?? [];

  return (
    <section className="relative min-h-svh grid grid-cols-1 md:grid-cols-2 font-poppins">
      {panels.map((panel) => (
        <Link
          key={panel.link}
          href={panel.link}
          className="group relative overflow-hidden h-[60vh] md:min-h-svh block"
          style={{ backgroundImage: `url('${panel.bg}')`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-black/55 group-hover:bg-black/65 transition duration-500" />

          <div className="relative z-10 flex h-full flex-col justify-end p-8 md:p-16 text-white">
            {eyebrow && <span className="uppercase tracking-[4px] text-xs sm:text-sm text-gray-300 mb-3">{eyebrow}</span>}

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight mb-5 max-w-xl">{panel.header}</h2>

            <p className="text-gray-200 text-base sm:text-lg leading-relaxed max-w-lg mb-6 font-light">{panel.text}</p>

            {buttonLabel && (
              <span className="inline-block w-fit border border-white px-6 py-3 sm:px-8 sm:py-4 rounded-full text-white group-hover:bg-white group-hover:text-black transition duration-300">
                {buttonLabel}
              </span>
            )}
          </div>
        </Link>
      ))}
    </section>
  );
}
