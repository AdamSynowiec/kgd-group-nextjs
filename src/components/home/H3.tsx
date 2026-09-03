import type { ReactNode } from "react";

export default function H3({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-semibold leading-[1.3] text-[#C9AB8B] font-poppins font-bold ${className}`.trim()}>
      {children}
    </h3>
  );
}
