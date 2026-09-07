"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type NavItem = { name: string; path: string };

type NavbarFields = {
  menu?: EditableValue<NavItem[]> | NavItem[];
  phone?: EditableValue<string> | string;
};

export default function Navbar({ fields }: { fields: NavbarFields }) {
  const menu = unwrap(fields.menu) ?? [];
  const phone = unwrap(fields.phone) ?? "";

  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "h-[90px] bg-[#1D1D1D]" : "h-[120px] bg-transparent"}`}>
      <Container>
        <div className={`flex flex-row items-center justify-between transition-all duration-300 ${scrolled ? "h-[90px]" : "h-[120px]"}`}>
          <a href="#">
            <img
              loading="eager"
              fetchPriority="high"
              decoding="async"
              src="/investments/pylna-residence/logo.svg"
              alt="Pylna Residence Logo"
              className={`transition-all duration-300 ${scrolled ? "max-h-[60px]" : "max-h-[90px]"}`}
            />
          </a>

          <div className="hidden lg:flex flex-row gap-[64px]">
            <ul className="text-white flex flex-row items-center gap-[24px] xl:gap-[48px] xl:text-[20px] transition-all duration-300">
              {menu.map((item) => (
                <li key={item.name} className="cursor-pointer hover:text-gray-300 transition font-ranade-variable font-thin">
                  <a href={item.path}>{item.name}</a>
                </li>
              ))}
            </ul>

            <ul className="text-white flex flex-row gap-[48px] text-[20px] transition-all duration-300">
              <li className="border border-slate-200 p-2 rounded-md cursor-pointer hover:text-gray-300 transition font-ranade-variable font-thin">{phone}</li>
            </ul>
          </div>

          <button className="block lg:hidden" onClick={() => setIsOpen(true)} aria-label="Otwórz menu">
            <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path fill="#FFFFFF" d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
            </svg>
          </button>
        </div>
      </Container>

      {isOpen && (
        <div className="fixed inset-0 bg-[#1D1D1D] z-50 flex flex-col p-6 pt-10 text-white">
          <button className="ml-auto mb-10" onClick={() => setIsOpen(false)} aria-label="Zamknij menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20">
              <path
                fill="#FFFFFF"
                d="M10 8.586L2.929 1.515L1.515 2.929L8.586 10l-7.071 7.071l1.414 1.414L10 11.414l7.071 7.071l1.414-1.414L11.414 10l7.071-7.071l-1.414-1.414L10 8.586z"
              />
            </svg>
          </button>

          <ul className="flex flex-col gap-8 text-3xl font-ranade-variable font-thin">
            {menu.map((item) => (
              <li key={item.name} onClick={() => setIsOpen(false)} className="cursor-pointer hover:text-gray-400">
                <a href={item.path}>{item.name}</a>
              </li>
            ))}
          </ul>

          <div className="mt-12 text-xl font-ranade-variable font-thin border border-slate-200 p-2 rounded-md text-center">{phone}</div>
        </div>
      )}
    </nav>
  );
}
