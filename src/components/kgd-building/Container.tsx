import type { ReactNode } from "react";

/** Mirror src/components/investments/rudava-park/Container.tsx — każda rodzina szablonów ma własny. */
export default function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`max-w-[1280px] mx-auto px-6 ${className}`}>{children}</div>;
}
