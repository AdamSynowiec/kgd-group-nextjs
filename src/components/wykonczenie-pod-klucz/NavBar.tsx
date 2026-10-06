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

/** Mirror src/components/kgd-building/NavBar.tsx — logo "KGD Group" (strona główna) zamiast sub-marki. */
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
        isScrolled ? "bg-[#1D1D1D] h-[80px]" : "h-[100px] md:h-[140px]"
      }`}
    >
      <Container className="h-full flex items-center justify-between">
        <Link href="/">
          <img
            loading="eager"
            fetchPriority="high"
            decoding="async"
            src="/home/logo.svg"
            alt="KGD Group"
            className={`transition-all duration-300 ${isScrolled ? "h-[32px]" : "h-[36px] md:h-[46px]"}`}
          />
        </Link>

        <nav className="hidden md:flex items-center gap-10 text-white text-[15px] font-ranade-variable">
          <ul className="flex gap-8">
            {menu.map((item) => (
              <li key={item.label}>
                <Link href={item.to} className="tracking-wide hover:text-[#C9AB8B] hover:underline transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="group inline-flex items-center gap-2 tracking-wide hover:text-[#C9AB8B] transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B] group-hover:scale-125 transition-transform duration-300" />
              {phone}
            </a>
          )}
        </nav>

        <button className="md:hidden text-white p-2" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Zamknij menu" : "Otwórz menu"}>
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </Container>

      <div
        className={`absolute top-full left-0 w-full bg-zinc-900 transition-all duration-300 md:hidden ${
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
