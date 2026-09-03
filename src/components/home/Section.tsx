import type { ReactNode } from "react";

export default function Section({ children, className = "", id = "" }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`w-full ${className}`}>
      {children}
    </div>
  );
}
