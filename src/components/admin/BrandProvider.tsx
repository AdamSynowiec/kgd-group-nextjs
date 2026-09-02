"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Branding panelu pochodzi z konfiguracji (site.json), nie jest zaszyty
 * w komponentach — dzięki temu ten sam panel (Sidebar, LoginForm, Topbar...)
 * da się użyć w innym projekcie bez zmiany kodu, samą podmianą site.json.
 */
export type Brand = { name: string; tagline?: string };

const BrandContext = createContext<Brand>({ name: "Panel" });

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand(): Brand {
  return useContext(BrandContext);
}
