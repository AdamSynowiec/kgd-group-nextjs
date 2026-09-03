import type { ReactNode } from "react";

export default function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`w-full max-w-[1536px] mx-auto px-3 sm:px-5 md:px-8 lg:px-16 xl:px-24 2xl:px-24 ${className}`}>{children}</div>;
}
