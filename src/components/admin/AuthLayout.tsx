"use client";

import type { ReactNode } from "react";
import { useBrand } from "@/components/admin/BrandProvider";

/**
 * Wspólne tło i nagłówek ekranów poza dashboardem: logowanie, potwierdzenie adresu e-mail,
 * reset hasła. Treść (formularz, komunikat) przychodzi jako children, w białej karcie.
 */
export default function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  const brand = useBrand();

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-zinc-50 px-6 py-12 font-sans antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(24,24,27,0.07)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-lg font-semibold text-white shadow-[0_8px_24px_-6px_rgba(16,24,40,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]">
            {brand.name.charAt(0).toUpperCase()}
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">{subtitle ?? `${brand.name} — zarządzanie treścią strony`}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-7 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_40px_-12px_rgba(16,24,40,0.12)]">{children}</div>

        {footer && <div className="mt-6 text-center text-xs text-zinc-400">{footer}</div>}
      </div>
    </main>
  );
}
