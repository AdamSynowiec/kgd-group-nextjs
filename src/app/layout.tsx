import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSite } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateMetadata(): Metadata {
  const { seoDefaults } = getSite();
  return {
    metadataBase: new URL(seoDefaults.metadataBase),
    title: { default: seoDefaults.title, template: `%s — ${seoDefaults.siteName}` },
    description: seoDefaults.description,
  };
}

export function generateViewport(): Viewport {
  const { seoDefaults } = getSite();
  return { themeColor: seoDefaults.themeColor };
}

/** Wspólne dla całej aplikacji (fonty, <html>/<body>). Nagłówek/stopka są tylko w (site)/layout.tsx. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
