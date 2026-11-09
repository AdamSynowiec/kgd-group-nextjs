"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Cookiebot + Google Tag Manager — GTM (a z nim GA4, Google Ads, Meta Pixel, Clarity) ładuje się
 * DOPIERO po zgodzie z Cookiebota. Identyfikatory w src/data/site.json ("analytics").
 *
 * Kolejność:
 *  1. od razu: tryb zgody Google (Consent Mode v2) — domyślnie wszystko "denied";
 *  2. po zdarzeniu `load` (jak wcześniej "lazyOnload" — nie blokuje pierwszego renderu):
 *     baner Cookiebot (uc.js, blokowanie ręczne — o skryptach decyduje ten komponent);
 *  3. CookiebotOnConsentReady (także przy kolejnej wizycie z zapisaną zgodą): aktualizacja
 *     trybu zgody Google wg kategorii i — gdy jest zgoda na statystykę lub marketing — GTM;
 *  4. cofnięcie zgody (kategoria była, teraz jej nie ma) — przeładowanie strony, żeby
 *     załadowane już skrypty przestały działać.
 *
 * Wcześniej Cookiebot był tagiem w GTM, więc GTM musiał startować przed zgodą. Tag Cookiebota
 * w kontenerze GTM trzeba teraz WSTRZYMAĆ (inaczej uc.js załaduje się drugi raz po zgodzie).
 * Uwaga: przy zgodzie tylko na statystykę GTM też się ładuje — tagi marketingowe (Meta Pixel)
 * muszą mieć w GTM warunek zgody na marketing (ad_storage), bo nie respektują trybu zgody Google.
 *
 * Bez cookiebotId (pusta wartość) — GTM ładuje się jak dawniej, z domyślnym "denied".
 * Panel /admin celowo NIE jest śledzony.
 */

type Consent = { necessary: boolean; preferences: boolean; statistics: boolean; marketing: boolean };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    Cookiebot?: { consent?: Consent; hasResponse?: boolean };
    __kgdGtmLoaded?: boolean;
    __kgdConsent?: Consent;
  }
}

const state = (granted: boolean) => (granted ? "granted" : "denied");

function ensureGtag() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params -- gtag wymaga obiektu "arguments", nie tablicy
      window.dataLayer!.push(arguments);
    };
  }
}

function loadGtm(gtmId: string) {
  if (window.__kgdGtmLoaded) return;
  window.__kgdGtmLoaded = true;
  window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

export default function Analytics({ gtmId, cookiebotId }: { gtmId?: string; cookiebotId?: string }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  useEffect(() => {
    if (isAdmin || !gtmId) return;

    // 1. Domyślnie brak zgody — zanim cokolwiek się załaduje.
    ensureGtag();
    if (!window.__kgdConsent) {
      window.gtag!("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        functionality_storage: "denied",
        personalization_storage: "denied",
        security_storage: "granted",
        wait_for_update: 2000,
      });
    }

    if (!cookiebotId) {
      const start = () => loadGtm(gtmId);
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
      return () => window.removeEventListener("load", start);
    }

    // 3–4. Decyzja z Cookiebota.
    const onConsent = () => {
      const consent = window.Cookiebot?.consent;
      if (!consent) return;
      const previous = window.__kgdConsent;
      window.__kgdConsent = { ...consent };

      if (previous && (["preferences", "statistics", "marketing"] as const).some((key) => previous[key] && !consent[key])) {
        window.location.reload();
        return;
      }

      window.gtag!("consent", "update", {
        ad_storage: state(consent.marketing),
        ad_user_data: state(consent.marketing),
        ad_personalization: state(consent.marketing),
        analytics_storage: state(consent.statistics),
        functionality_storage: state(consent.preferences),
        personalization_storage: state(consent.preferences),
      });
      if (consent.statistics || consent.marketing) loadGtm(gtmId);
    };
    window.addEventListener("CookiebotOnConsentReady", onConsent);

    // 2. Baner Cookiebot po załadowaniu strony.
    const startCookiebot = () => {
      if (document.getElementById("Cookiebot")) return;
      const script = document.createElement("script");
      script.id = "Cookiebot";
      script.src = "https://consent.cookiebot.com/uc.js";
      script.async = true;
      script.dataset.cbid = cookiebotId;
      script.dataset.blockingmode = "manual";
      document.head.appendChild(script);
    };
    if (document.readyState === "complete") startCookiebot();
    else window.addEventListener("load", startCookiebot, { once: true });

    // Cookiebot mógł być gotowy, zanim dodaliśmy nasłuch (np. po nawigacji w aplikacji).
    if (window.Cookiebot?.hasResponse) onConsent();

    return () => {
      window.removeEventListener("CookiebotOnConsentReady", onConsent);
      window.removeEventListener("load", startCookiebot);
    };
  }, [isAdmin, gtmId, cookiebotId]);

  return null;
}
