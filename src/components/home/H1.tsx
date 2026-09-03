import type { ReactNode } from "react";

export default function H1({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={`font-semibold md:font-bold tracking-tight text-4xl/[56px] md:text-5xl/[68px] lg:text-[3.5vw]/[4.5vw] text-white font-poppins ${className}`}
    >
      {children}
    </h1>
  );
}
