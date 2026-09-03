"use client";

import { useState } from "react";

export type MenuItem = { label: string; to: string; children?: MenuItem[] };

export default function NavMenuItem({ item, isMobile = false, onNavigate }: { item: MenuItem; isMobile?: boolean; onNavigate?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = !!item.children?.length;

  return (
    <li className="relative group">
      <a
        href={item.to}
        className="hover:text-white hover:underline flex items-center justify-between p-2"
        onClick={() => {
          if (isMobile && hasChildren) {
            setIsOpen(!isOpen);
          } else if (isMobile) {
            onNavigate?.();
          }
        }}
      >
        {item.label}
      </a>

      {hasChildren && (
        <ul
          className={
            isMobile
              ? isOpen
                ? "block ml-4"
                : "hidden"
              : "absolute top-full left-0 bg-[#1D1D1D] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 min-w-[150px]"
          }
        >
          {item.children!.map((child) => (
            <NavMenuItem key={child.label} item={child} isMobile={isMobile} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
}
