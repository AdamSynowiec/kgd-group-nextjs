import type { ReactNode } from "react";

/**
 * Ikony liniowe FOXHILLS (24×24, obrys currentColor) — jeden zestaw dla cech inwestycji,
 * kategorii lokalizacji i znaczników mapy. Nazwy pochodzą z pól w bazie ("icon").
 */
const PATHS: Record<string, ReactNode> = {
  golf: (
    <>
      <path d="M9 21V3l9 4-9 4" />
      <path d="M3 21h18" />
      <circle cx="16" cy="18" r="1.2" />
    </>
  ),
  forest: (
    <>
      <path d="M12 2.5l4.2 6H14l3.6 5.2h-3.9L17 18.5H7l3.3-4.8H6.4L10 8.5H7.8z" />
      <path d="M12 18.5v3" />
    </>
  ),
  water: (
    <>
      <path d="M2.5 8.5c2.4 0 2.4 2 4.8 2s2.4-2 4.8-2 2.4 2 4.8 2 2.4-2 4.6-2" />
      <path d="M2.5 13.5c2.4 0 2.4 2 4.8 2s2.4-2 4.8-2 2.4 2 4.8 2 2.4-2 4.6-2" />
      <path d="M2.5 18.5c2.4 0 2.4 2 4.8 2s2.4-2 4.8-2 2.4 2 4.8 2 2.4-2 4.6-2" />
    </>
  ),
  glass: (
    <>
      <rect x="3" y="4.5" width="18" height="15" />
      <path d="M9 4.5v15M15 4.5v15" />
      <path d="M5.2 16.5l2.4-2.6" />
    </>
  ),
  spa: (
    <>
      <path d="M3.5 13.5h17v2a4.5 4.5 0 0 1-4.5 4.5H8a4.5 4.5 0 0 1-4.5-4.5z" />
      <circle cx="8.5" cy="9.5" r="1.3" />
      <circle cx="12.7" cy="6.2" r="1.7" />
      <circle cx="16.4" cy="10" r="1" />
    </>
  ),
  garage: (
    <>
      <path d="M3 10.5L12 4l9 6.5V20H3z" />
      <path d="M7 20v-7h10v7M7 15.7h10" />
    </>
  ),
  garden: (
    <>
      <path d="M4.5 19.5C4.5 11 10 5 19.5 4.5c0 9-5.8 15-15 15z" />
      <path d="M4.5 19.5L13 11" />
    </>
  ),
  light: (
    <>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.6 1 .6 1.7V16h6v-.5c0-.7.1-1.3.6-1.7A6 6 0 0 0 12 3z" />
      <path d="M9.5 19h5M10.5 21.5h3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </>
  ),
  facade: (
    <>
      <path d="M3 21V9l9-6 9 6v12z" />
      <path d="M8 21V12M12 21V12M16 21V12M3 9h18" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  area: (
    <>
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </>
  ),
  bed: (
    <>
      <path d="M3 19V6M3 14h18v5M21 14v-2.5A2.5 2.5 0 0 0 18.5 9H11v5" />
      <circle cx="7" cy="11" r="1.6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3M14 9l2 2" />
    </>
  ),
  city: (
    <>
      <path d="M3 21V9h6v12M9 21V4h7v17M16 21v-8h5v8M2 21h20" />
      <path d="M11.5 8h2M11.5 12h2M11.5 16h2" />
    </>
  ),
  plane: (
    <>
      <path d="M21 4.5c-1.4-1.4-3.4-.7-4.5.4L13 8.4 4.5 6.7 3 8.2l7 3.3-3.2 3.3-3-.5L2.5 16l3.7 1.3L7.5 21l1.2-1.3-.5-3 3.3-3.2 3.3 7 1.5-1.5-1.7-8.5 3.5-3.5c1.1-1.1 1.8-3.1.4-4.5z" />
    </>
  ),
  helipad: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 7.5v9M15 7.5v9M9 12h6" />
    </>
  ),
  road: (
    <>
      <path d="M8 3L4 21M16 3l4 18M12 3v3M12 10v4M12 18v3" />
    </>
  ),
  school: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11.5V17c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5M22 9v6" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.5l2.2 11h10.3l2-8H6.5" />
      <circle cx="9" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </>
  ),
  health: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  restaurant: (
    <>
      <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10" />
      <path d="M17 21V3c-2.2 1.2-3.5 3.8-3.5 7.5V14H17" />
    </>
  ),
  car: (
    <>
      <path d="M4.5 15l1.6-5a2 2 0 0 1 1.9-1.4h8a2 2 0 0 1 1.9 1.4l1.6 5" />
      <path d="M3 15h18v3.5H3zM6.5 18.5V20M17.5 18.5V20" />
      <circle cx="7.5" cy="16.8" r=".6" />
      <circle cx="16.5" cy="16.8" r=".6" />
    </>
  ),
  phone: (
    <path d="M5 4h3.5l1.7 4.2-2.2 1.5a11 11 0 0 0 5.3 5.3l1.5-2.2L19 14.5V18a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2z" />
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  download: <path d="M12 3v12M7 10.5l5 5 5-5M4 20h16" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  arrow: <path d="M4 12h16M14 6l6 6-6 6" />,
  chevronLeft: <path d="M15 4l-8 8 8 8" />,
  chevronRight: <path d="M9 4l8 8-8 8" />,
  chevronDown: <path d="M4 9l8 8 8-8" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  menu: <path d="M3 7h18M3 12h18M3 17h12" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3L7 7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1" />
      <path d="M3.5 6l8.5 7 8.5-7" />
    </>
  ),
};

export type IconName = keyof typeof PATHS | (string & {});

export function Icon({ name, className = "h-6 w-6", strokeWidth = 1.2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name] ?? PATHS.pin}
    </svg>
  );
}
