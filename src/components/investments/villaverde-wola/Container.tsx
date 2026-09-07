export default function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`max-w-[1440px] mx-auto px-4 ${className}`.trim()}>{children}</div>;
}
