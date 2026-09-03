import type { ReactNode } from "react";

export default function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`font-playfairdisplay text-[38px] lg:text-[64px] text-[#383838] ${className}`}>{children}</h1>;
}
