"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import Button from "./Button";

type MenuItem = { label: string; path: string };
type PhoneValue = { number: string };

type NavbarFields = {
  logo: EditableValue<string> | string;
  phone: EditableValue<PhoneValue> | PhoneValue;
  menu?: EditableValue<MenuItem[]> | MenuItem[];
};

export default function Navbar({ fields }: { fields: NavbarFields }) {
  const logo = unwrap(fields.logo);
  const phone = unwrap(fields.phone);
  const menu = unwrap(fields.menu) ?? [];

  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "h-[100px] bg-[#303A3C]/95 backdrop-blur-md" : "h-[100px] md:h-[150px] bg-black/25"
        }`}
      >
        <Container>
          <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? "h-[100px]" : "h-[100px] md:h-[150px]"}`}>
            <Link href="/">
              <img
                loading="eager"
                fetchPriority="high"
                decoding="async"
                src={logo}
                alt="Logo"
                className={`transition-all duration-300 ${scrolled ? "w-[170px] md:w-[200px]" : "w-[170px] md:w-[270px]"}`}
              />
            </Link>

            <nav className="hidden lg:flex items-center">
              <ul className="flex gap-[24px] mr-[48px] font-lato text-[20px] text-white">
                {menu.map((item) => (
                  <li key={item.path}>
                    <a href={item.path} className="cursor-pointer hover:underline transition-opacity hover:opacity-80">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              {phone && <Button type="primary" value={phone.number} />}
            </nav>

            <button className="lg:hidden" onClick={() => setIsOpen(true)} aria-label="Menu">
              <svg className="w-8 h-8" viewBox="0 0 20 20">
                <path fill="#fff" d="M0 3h20v2H0zM0 9h20v2H0zM0 15h20v2H0z" />
              </svg>
            </button>
          </div>
        </Container>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black text-white flex flex-col p-8">
          <button className="ml-auto mb-10" onClick={() => setIsOpen(false)} aria-label="Zamknij menu">
            <svg className="w-8 h-8" viewBox="0 0 20 20">
              <path fill="#fff" d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414z" />
            </svg>
          </button>

          <ul className="flex flex-col gap-8 text-3xl font-lato">
            {menu.map((item) => (
              <li key={item.path}>
                <a href={item.path} onClick={() => setIsOpen(false)} className="cursor-pointer hover:opacity-70">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {phone && (
            <div className="mt-auto">
              <Button type="primary" value={phone.number} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
