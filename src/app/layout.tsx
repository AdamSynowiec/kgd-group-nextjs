import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSite } from "@/lib/content";
import Analytics from "@/components/seo/Analytics";
import "./globals.css";
import "./blog-article.css";

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
    // Ikony 1:1 jak na starej stronie (pliki w public/). favicon.ico dokłada sam
    // Next.js z pliku src/app/favicon.ico (konwencja plikowa), więc nie ma go tutaj.
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
        { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      ],
    },
  };
}

export function generateViewport(): Viewport {
  const { seoDefaults } = getSite();
  return { themeColor: seoDefaults.themeColor };
}

/** Wspólne dla całej aplikacji (fonty, <html>/<body>). Nagłówek/stopka są tylko w (site)/layout.tsx. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  const { analytics } = getSite();

  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Analytics gtmId={analytics?.gtmId} gaId={analytics?.gaId} />
        {children}
      </body>
    </html>
  );
}
