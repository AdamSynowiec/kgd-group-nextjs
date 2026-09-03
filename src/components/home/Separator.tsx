export default function Separator({ className = "" }: { className?: string }) {
  return <div className={`w-[75px] md:w-[150px] h-[4px] md:h-[7px] bg-[#C9AB8B] rounded-[50px] ${className}`} />;
}
