"use client";

import { useEffect, useState } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";

type NavItem = { label: string; to: string };
type PhonePayload = { number: string; anchor: string };

type NavBarFields = {
  logo: EditableValue<string> | string;
  phone?: PhonePayload;
  menu?: EditableValue<NavItem[]> | NavItem[];
};

export default function NavBar({ fields }: { fields: NavBarFields }) {
  const logo = unwrap(fields.logo);
  const menu = unwrap(fields.menu) ?? [];

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={`absolute inset-0 -z-10 transition-all duration-700 ${scrolled ? "bg-[#f6f5f2] backdrop-blur-sm" : "bg-[#f6f5f2] backdrop-blur-sm"}`} />

      <nav className="mx-auto flex items-center justify-between px-6 lg:px-10 py-4 shadow-sm">
        <a href="#" className="flex items-center">
          <img loading="eager" fetchPriority="high" decoding="async" src={logo} alt="Morelife Apartments" className="h-10 w-auto transition duration-500" />
        </a>

        <ul className="hidden lg:flex items-center gap-12 text-[11px] uppercase tracking-[0.28em] text-black/80 transition-colors duration-500">
          {menu.map((item) => (
            <li key={item.label} className="relative group">
              <a
                href={item.to}
                className="relative pb-1 after:absolute after:left-0 after:bottom-0 after:h-[1px] after:w-0 after:bg-current group-hover:after:w-full after:transition-all after:duration-300 opacity-90 hover:opacity-100"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <button onClick={() => setOpen((v) => !v)} className="lg:hidden text-black" aria-label="Menu">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="1.2" />
            ) : (
              <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.2" />
            )}
          </svg>
        </button>
      </nav>

      <div className={`lg:hidden absolute inset-x-0 top-full bg-white border-t border-black/5 transition-all duration-500 ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}>
        <ul className="px-6 py-6 space-y-6">
          {menu.map((item) => (
            <li key={item.label}>
              <a href={item.to} className="text-[11px] uppercase tracking-[0.25em] text-black/80" onClick={() => setOpen(false)}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
