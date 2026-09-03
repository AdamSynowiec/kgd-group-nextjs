"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type NavItem = { link: string; label: string };

type NavbarFields = {
  nav?: EditableValue<NavItem[]> | NavItem[];
};

export default function Navbar({ fields }: { fields: NavbarFields }) {
  const nav = unwrap(fields.nav) ?? [];
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      className={`fixed top-0 w-full z-40 ${isScrolled ? "bg-[#FCFCFC]" : ""} transition-all duration-300 ${
        isScrolled ? "min-h-[100px]" : "min-h-[150px]"
      }`}
    >
      <Container>
        <div
          className={`flex flex-row items-center justify-between transition-all duration-300 ${
            isScrolled ? "min-h-[100px]" : "min-h-[150px]"
          }`}
        >
          <img
            loading="eager"
            fetchPriority="high"
            decoding="async"
            src="/investments/rudava-park/logo.svg"
            alt="logo"
            className={`transition-all duration-300 ${
              isScrolled ? "w-[140px]" : "w-[160px] md:w-[260px] filter invert"
            }`}
          />

          <nav className="flex flex-row">
            <ul className="hidden lg:flex flex-row gap-[46px]">
              {nav.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.link || "#"}
                    className={`${isScrolled ? "" : "text-white"} font-ranade-variable hover:underline`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <button
              className={`block lg:hidden filter ${isScrolled ? "" : "invert"} lg:invert-0`}
              onClick={() => setIsOpen(true)}
              aria-label="Otwórz menu"
            >
              <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path fill="#000000" d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
              </svg>
            </button>
          </nav>
        </div>
      </Container>

      {isOpen && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col p-4 py-[32px]">
          <button className="ml-auto mb-10" onClick={() => setIsOpen(false)} aria-label="Zamknij menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20">
              <path
                fill="#000000"
                d="M10 8.586L2.929 1.515L1.515 2.929L8.586 10l-7.071 7.071l1.414 1.414L10 11.414l7.071 7.071l1.414-1.414L11.414 10l7.071-7.071l-1.414-1.414L10 8.586z"
              />
            </svg>
          </button>

          <ul className="flex flex-col gap-6 text-2xl">
            {nav.map((item) => (
              <li key={item.label}>
                <a href={item.link || "#"} className="font-ranade-variable hover:underline" onClick={() => setIsOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
