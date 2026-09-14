"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { MenuIcon, CloseIcon } from "./icons";

type MenuItem = { label: string; to: string };

type NavBarFields = {
  menu?: EditableValue<MenuItem[]> | MenuItem[];
  phone?: EditableValue<string> | string;
};

/** Mirror src/components/investments/rudava-park/Navbar.tsx — scroll state + drawer mobilny. Kotwice (#id) i "/" (link do strony głównej) obsługiwane tym samym <Link>. */
export default function NavBar({ fields }: { fields: NavBarFields }) {
  const menu = unwrap(fields.menu) ?? [];
  const phone = unwrap(fields.phone);

  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 font-poppins transition-all duration-300 ${
        isScrolled ? "bg-[#1D1D1D] h-[80px]" : "h-[100px] md:h-[160px]"
      }`}
    >
      <Container className="h-full flex items-center justify-between">
        <Link href="/">
          <img
            loading="eager"
            fetchPriority="high"
            decoding="async"
            src="/investments/shared/kgd-building-logo.svg"
            alt="KGD Building"
            className={`transition-all duration-300 ${isScrolled ? "h-[32px]" : "h-[36px] md:h-[46px]"}`}
          />
        </Link>

        <nav className="hidden xl:flex items-center gap-8 text-white text-[15px]">
          <ul className="flex gap-6">
            {menu.map((item) => (
              <li key={item.label}>
                <Link href={item.to} className="tracking-wide hover:text-[#C9AB8B] transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {phone && (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="group inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/15 bg-white/5 text-white font-light transition-all duration-300 hover:border-[#C9AB8B]/60 hover:bg-[#C9AB8B]/10"
            >
              <span className="w-2 h-2 rounded-full bg-[#C9AB8B] group-hover:scale-125 transition-transform duration-300" />
              <span className="tracking-wide group-hover:text-[#C9AB8B] transition-colors duration-300">{phone}</span>
            </a>
          )}
        </nav>

        <button className="xl:hidden text-white p-2" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Zamknij menu" : "Otwórz menu"}>
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </Container>

      <div
        className={`absolute top-full left-0 w-full bg-zinc-900 transition-all duration-300 xl:hidden ${
          isOpen ? "h-auto opacity-100" : "h-0 opacity-0 pointer-events-none overflow-hidden"
        }`}
      >
        <ul className="flex flex-col gap-6 py-6 px-6 text-white text-lg">
          {menu.map((item) => (
            <li key={item.label}>
              <Link href={item.to} className="hover:text-[#C9AB8B] transition-colors" onClick={() => setIsOpen(false)}>
                {item.label}
              </Link>
            </li>
          ))}
          {phone && (
            <li>
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="text-[#C9AB8B]">
                {phone}
              </a>
            </li>
          )}
        </ul>
      </div>
    </header>
  );
}
