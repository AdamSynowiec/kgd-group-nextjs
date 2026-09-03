import type { ReactNode } from "react";

export default function P({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-lato text-[18px]/[36px] lg:text-[26px]/[52px] font-light text-[#707070] ${className}`}>{children}</p>;
}
