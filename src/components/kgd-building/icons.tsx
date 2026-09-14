/**
 * Zestaw prostych ikon inline (SVG) — projekt świadomie nie ma zależności
 * lucide-react (sprawdzone: brak w package.json), więc zamiast doinstalować
 * bibliotekę na potrzeby kilku ikon, mirror istniejącej konwencji "inline
 * SVG w komponencie" (patrz socialIcons w src/components/investments/*).
 */
export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.3 2.3L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3.5v5c0 4.5-3 8.2-7 9.5-4-1.3-7-5-7-9.5v-5L12 3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function KeyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M10.5 12.5L20 3M17 6l2 2M14 9l2 2" />
    </svg>
  );
}

export function ClipboardIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 11h6M9 15h6" />
    </svg>
  );
}

export function HardHatIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 18a8 8 0 0116 0" />
      <path d="M12 6v6M2 18h20" />
    </svg>
  );
}

export function BuildingIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3a2 2 0 014 0v3" />
    </svg>
  );
}

export function FileDownIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M12 11v7M9 15l3 3 3-3" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function MenuIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
    </svg>
  );
}

export function CloseIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 8.586L2.929 1.515L1.515 2.929L8.586 10l-7.071 7.071l1.414 1.414L10 11.414l7.071 7.071l1.414-1.414L11.414 10l7.071-7.071l-1.414-1.414L10 8.586z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 51 27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M49.7 1.1L25.5 25.3 1.3 1.1" />
    </svg>
  );
}

const socialPaths: Record<string, { viewBox: string; path: string }> = {
  youtube: {
    viewBox: "0 0 32 24",
    path: "M30.722 20.579C30.137 21.894 28.628 23.085 27.211 23.348C27.066 23.375 23.603 24 16.01 24H15.99C8.398 24 4.932 23.375 4.788 23.349C3.371 23.085 1.861 21.894 1.275 20.578C1.223 20.461 0.001 17.647 0.001 12C0.001 6.353 1.223 3.538 1.275 3.421C1.861 2.105 3.371 0.915 4.788 0.652C4.932 0.625 8.398 0 15.99 0C23.603 0 27.066 0.625 27.21 0.651C28.628 0.915 30.137 2.105 30.723 3.42C30.775 3.538 32 6.353 32 12C32 17.647 30.775 20.461 30.722 20.579ZM14.009 8.794V15.189L19.137 11.963L14.009 8.794Z",
  },
};

/** YouTube/Instagram/Facebook — mirror socialIcons w starym Hero.jsx (kgd-building). */
export function SocialIcon({ icon, className = "h-[22px] w-[22px]" }: { icon: string; className?: string }) {
  if (icon === "youtube") {
    return (
      <svg className={className} viewBox={socialPaths.youtube.viewBox} fill="currentColor">
        <path d={socialPaths.youtube.path} />
      </svg>
    );
  }
  if (icon === "instagram") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22V12.9H16.5L17 9.4H13.5V7.2C13.5 6.2 13.8 5.5 15.2 5.5H17.1V2.3C16.8 2.3 15.7 2.2 14.4 2.2C11.7 2.2 9.9 3.8 9.9 6.8V9.4H7V12.9H9.9V22H13.5Z" />
    </svg>
  );
}
