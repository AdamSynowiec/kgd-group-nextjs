import { Icon } from "./icons";

/**
 * Ikony filarów sekcji „O inwestycji” — te same, cienkie, geometryczne rysunki co w Rudava Park
 * (public/investments/foxhills/icons/*.svg, białe kreski). Na jasnym tle czernimy je filtrem,
 * a po najechaniu na filar (group-hover) wracają do bieli.
 * Klucz = wartość pola "icon" filaru w bazie.
 */
const FILES: Record<string, string> = {
  facade: "house",
  pin: "map",
  spa: "garden",
  key: "cube",
};

export function PillarIcon({ name, className = "h-24 w-24" }: { name: string; className?: string; strokeWidth?: number }) {
  const file = FILES[name];
  if (!file) return <Icon name={name} className={className} />;
  return (
    <img
      src={`/investments/foxhills/icons/icon-${file}.svg`}
      alt=""
      loading="lazy"
      decoding="async"
      className={`object-contain brightness-0 transition-[filter] duration-500 group-hover:brightness-100 ${className}`}
    />
  );
}
