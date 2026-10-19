"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Google Tag Manager + Google Analytics 4 (gtag.js) — 1:1 ze starej strony
 * (index.html starego projektu): ten sam snippet GTM, <noscript> z iframe na
 * początku <body> i osobny gtag.js z config. Identyfikatory w
 * src/data/site.json ("analytics"), pusty identyfikator = dany skrypt się nie ładuje.
 *
 * next/script (wbudowany w Next.js) zamiast @next/third-parties — bez nowej
 * zależności. strategy "lazyOnload" = ładowanie po zdarzeniu `load`, w czasie
 * bezczynności przeglądarki (wcześniej "afterInteractive"). GTM ciągnie za sobą
 * gtag, Facebook Pixel, Clarity i Cookiebot — na mobile blokowały one pierwszy
 * render (Lighthouse mobile, lokalnie: FCP 5,6 → 2,4 s, LCP 16,4 → 7,6 s). Koszt: śledzenie
 * i baner cookies startują ~1–3 s później.
 *
 * Panel /admin celowo NIE jest śledzony (wejścia redaktorów zawyżałyby
 * statystyki i trafiałyby do GTM razem z danymi z formularzy panelu).
 */
export default function Analytics({ gtmId, gaId }: { gtmId?: string; gaId?: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      {gtmId && (
        <>
          <Script id="gtm" strategy="lazyOnload">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="lazyOnload" />
          <Script id="gtag-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(gaId)});`}
          </Script>
        </>
      )}
    </>
  );
}
