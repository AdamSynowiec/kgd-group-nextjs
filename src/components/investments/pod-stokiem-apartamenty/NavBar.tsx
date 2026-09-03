"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type MenuItem = { label: string; to: string };
type PhoneValue = { number: string; anchor?: string };

type NavBarFields = {
  phone: EditableValue<PhoneValue> | PhoneValue;
  menu?: EditableValue<MenuItem[]> | MenuItem[];
  menuMobile?: EditableValue<MenuItem[]> | MenuItem[];
};

export default function NavBar({ fields }: { fields: NavBarFields }) {
  const phone = unwrap(fields.phone);
  const menu = unwrap(fields.menu) ?? [];
  const menuMobile = unwrap(fields.menuMobile) ?? [];

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section>
      <div className={`fixed left-0 right-0 z-50 transition-all duration-500 ease-out ${scrolled ? "bg-[#1A1D23] min-h-[100px]" : "min-h-[150px]"}`}>
        <Container>
          <div className={`flex flex-row justify-between items-center transition-all duration-500 ease-out ${scrolled ? "min-h-[100px]" : "min-h-[150px]"}`}>
            <ul className="hidden lg:flex flex-row items-center justify-between w-1/3 text-[20px] text-[#F5F5F5]">
              <li className="transition-all duration-500 ease-out">
                <img
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  src="/investments/pod-stokiem-apartamenty/logo.svg"
                  alt="logo"
                  className={`${scrolled ? "scale-85" : ""} max-w-[150px] md:max-w-[200px] transition-all duration-500`}
                />
              </li>
            </ul>

            <ul className="font-poppins font-light hidden lg:flex flex-row justify-end w-full text-[20px] text-[#F5F5F5] gap-[18px] xl:gap-[32px]">
              {menu.map((item) => (
                <li key={item.label} className="hover:underline cursor-pointer transition">
                  <a href={item.to}>{item.label}</a>
                </li>
              ))}
              {phone && (
                <li className="cursor-pointer transition ml-[32px]">
                  <a href="#kontakt">{phone.number}</a>
                </li>
              )}
            </ul>

            <ul className="flex lg:hidden flex-row justify-between items-center w-full">
              <li>
                <img
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  src="/investments/pod-stokiem-apartamenty/logo.svg"
                  alt="logo"
                  className={`${scrolled ? "scale-85" : "scale-100"} max-w-[150px] md:max-w-[200px] h-[50px] transition-all duration-500`}
                />
              </li>
              <li>
                <button className="relative z-50" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                  {menuOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20">
                      <path fill="#fff" d="M10 8.586L2.929 1.515L1.515 2.929L8.586 10l-7.071 7.071l1.414 1.414L10 11.414l7.071 7.071l1.414-1.414L11.414 10l7.071-7.071l-1.414-1.414L10 8.586z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" viewBox="0 0 20 20">
                      <path fill="#fff" d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
                    </svg>
                  )}
                </button>
              </li>
            </ul>
          </div>
        </Container>

        <div
          className={`fixed top-0 left-0 w-full h-screen bg-[#1A1D23] flex flex-col justify-center items-center text-white text-[30px] transition-transform duration-500 ease-in-out z-40 ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
          }`}
        >
          <ul className="flex flex-col items-center space-y-12 font-libre-caslon text-[24px]">
            {menuMobile.map((item) => (
              <li key={item.label} className="hover:underline cursor-pointer transition">
                <a href={item.to} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
