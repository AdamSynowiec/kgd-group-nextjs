import type { ReactNode } from "react";

/** Proste ikony liniowe (SVG, bez zależności) pod nawigację panelu. */

type IconProps = { className?: string };

export function PagesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" strokeLinejoin="round" />
      <path d="M14 3.5V8h4.5" strokeLinejoin="round" />
      <path d="M9 12.5h6M9 15.5h6M9 9.5h2" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
      />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.8-3.8" strokeLinecap="round" />
    </svg>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h3.6a1.5 1.5 0 0 1 1.2.6l1 1.4a1.5 1.5 0 0 0 1.2.6H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z" strokeLinejoin="round" />
    </svg>
  );
}

function Line({ className, children, strokeWidth = 1.75 }: IconProps & { children: ReactNode; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return <Line className={className} strokeWidth={2}><path d="M12 5v14M5 12h14" /></Line>;
}

export function TrashIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.5A1 1 0 0 1 10 3.5h4a1 1 0 0 1 1 1V7" />
    </Line>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return <Line className={className}><path d="M19 12H5M11 18l-6-6 6-6" /></Line>;
}

export function ChevronRightIcon({ className }: IconProps) {
  return <Line className={className} strokeWidth={2}><path d="m9 6 6 6-6 6" /></Line>;
}

export function LogoutIcon({ className }: IconProps) {
  return <Line className={className}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" /></Line>;
}

export function MenuIcon({ className }: IconProps) {
  return <Line className={className}><path d="M4 7h16M4 12h16M4 17h16" /></Line>;
}

export function CloseIcon({ className }: IconProps) {
  return <Line className={className}><path d="M6 6l12 12M18 6 6 18" /></Line>;
}

export function CheckIcon({ className }: IconProps) {
  return <Line className={className} strokeWidth={2}><path d="m5 12.5 4.5 4.5L19 7.5" /></Line>;
}

export function ExternalIcon({ className }: IconProps) {
  return <Line className={className}><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></Line>;
}

export function RocketIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2c.8-.8.8-2.2 0-3s-2.2-.8-3 0Z" />
      <path d="M9 13l2 2M14.5 4.5c2.5-1 5-1 5-1s0 2.5-1 5L13 14l-3-3 4.5-6.5Z" />
      <path d="M10 11H6l2.5-3H12M13 14v4l3-2.5V12" />
    </Line>
  );
}

export function HomeIcon({ className }: IconProps) {
  return <Line className={className}><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15V15h-6v5.5H5.5A1.5 1.5 0 0 1 4 19Z" /></Line>;
}

export function LayersIcon({ className }: IconProps) {
  return <Line className={className}><path d="M12 3 21 8l-9 5-9-5 9-5ZM3 13l9 5 9-5" /></Line>;
}

export function FileIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4.5" />
    </Line>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <Line className={className}>
      <path d="M4 20h16M6.5 20v-6M11 20V9M15.5 20v-8M20 20V5" />
    </Line>
  );
}
