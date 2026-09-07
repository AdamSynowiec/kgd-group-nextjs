"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";

type NavItem = { name: string; path: string };

type NavBarFields = {
  menu?: EditableValue<NavItem[]> | NavItem[];
  phone?: EditableValue<string> | string;
};

export default function NavBar({ fields }: { fields: NavBarFields }) {
  const menu = unwrap(fields.menu) ?? [];
  const phone = unwrap(fields.phone) ?? "";

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const linkClass = "hover:text-white transition-colors font-light tracking-wide";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-black/85 h-[80px]" : "bg-black/50 h-[120px]"}`}>
      <div className="container max-w-[1596px] mx-auto h-full px-6 flex items-center justify-between">
        <a href="#top">
          <img
            loading="eager"
            fetchPriority="high"
            decoding="async"
            src="/investments/krj307-2/logo.svg"
            alt="Logo"
            className={`transition-all duration-300 ${isScrolled ? "h-[60px]" : "h-[60px] md:h-[100px]"}`}
          />
        </a>

        <nav className="hidden xl:flex items-center space-x-10 text-[#FAF2E9] text-lg">
          {menu.map((item) => (
            <a key={item.name} href={item.path} className={linkClass}>
              {item.name}
            </a>
          ))}
        </nav>

        <button className="xl:hidden text-white p-2" onClick={() => setIsMenuOpen(true)} aria-label="Menu">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div
        className={`absolute top-full left-0 w-full transition-all duration-300 xl:hidden ${isScrolled ? "bg-black/85" : "bg-black/50"} ${
          isMenuOpen ? "opacity-100 h-auto pointer-events-auto" : "opacity-0 h-0 pointer-events-none"
        }`}
      >
        <ul className="flex flex-col gap-6 py-6 px-6 text-[#FAF2E9] text-lg">
          {menu.map((item) => (
            <li key={item.name}>
              <a href={item.path} className="flex justify-between items-center w-full" onClick={() => setIsMenuOpen(false)}>
                {item.name}
                <span className="ml-2">
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m9 5 7 7-7 7" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-6 text-[#FAF2E9]">
          <div className="border border-slate-200 p-2 rounded-md text-center">{phone}</div>
        </div>
      </div>
    </header>
  );
}
