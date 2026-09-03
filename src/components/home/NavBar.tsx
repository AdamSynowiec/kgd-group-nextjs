"use client";

import { useEffect, useState } from "react";
import NavMenuItem, { type MenuItem } from "./NavMenuItem";

export default function NavBar({ logo, menu, phone }: { logo: string; menu: MenuItem[]; phone: string }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-[#1D1D1D] h-[80px]" : "h-[100px] md:h-[200px]"}`}>
      <div className="container max-w-[1596px] mx-auto h-full px-6 flex items-center justify-between">
        <div className="flex items-center">
          <a href="#">
            <img
              loading="eager"
              fetchPriority="high"
              decoding="async"
              src={logo}
              alt="Logo"
              width={267}
              height={63}
              className={`w-auto transition-all duration-300 ${isScrolled ? "h-[35px] lg:h-[52px]" : "h-[40px] lg:h-[52px]"}`}
            />
          </a>
        </div>

        <nav className="hidden xl:flex items-center space-x-8 text-white text-[16px] relative">
          <ul className="flex space-x-4">
            {menu.map((item) => (
              <NavMenuItem key={item.label} item={item} onNavigate={() => setIsMenuOpen(false)} />
            ))}
          </ul>
        </nav>

        <div className="hidden xl:block">
          <a
            href={`tel:${phone}`}
            className="group inline-flex items-center gap-3 px-6 py-2 rounded-full border border-white/15 bg-white/5 text-white font-poppins font-light transition-all duration-300 hover:border-[#C9AB8B]/60 hover:bg-[#C9AB8B]/10"
          >
            <span className="w-2 h-2 rounded-full bg-[#C9AB8B] shadow-[0_0_10px_rgba(201,171,139,0.6)] group-hover:scale-125 transition-transform duration-300" />
            <span className="tracking-wide group-hover:text-[#C9AB8B] transition-colors duration-300">{phone}</span>
          </a>
        </div>

        <button className="xl:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
          {isMenuOpen ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div
        className={`absolute top-full left-0 w-full bg-zinc-900 transition-all duration-300 xl:hidden ${isMenuOpen ? "h-auto opacity-100" : "h-0 opacity-0 pointer-events-none"}`}
      >
        <ul className="flex flex-col gap-6 py-6 text-white text-lg px-6">
          {menu.map((item) => (
            <NavMenuItem key={item.label} item={item} isMobile onNavigate={() => setIsMenuOpen(false)} />
          ))}
        </ul>
      </div>
    </header>
  );
}
