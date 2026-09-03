import type { ButtonHTMLAttributes } from "react";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  type?: "primary" | "secondary";
  value: string;
};

const variants = {
  primary: "bg-[#975F3C]",
  secondary: "bg-white/[0.1] border-2 border-white",
};

export default function Button({ type = "primary", value, className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`px-[24px] text-white text-[20px]/[64px] cursor-pointer hover:opacity-[0.8] transition-all w-full ${variants[type]} ${className}`}
      {...props}
    >
      {value}
    </button>
  );
}
