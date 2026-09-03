import type { ReactNode } from "react";

export default function H2({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-playfairdisplay text-[32px] lg:text-[48px] text-[#383838] ${className}`}>{children}</h2>;
}
