/**
 * Parametry kampanii (utm_source/utm_medium/utm_campaign) z adresu, pod który
 * wszedł odwiedzający — zapamiętywane na czas wizyty (sessionStorage), bo
 * formularz zwykle wysyła się z innej podstrony niż ta z linku kampanii.
 * Trafiają do CRM razem ze zgłoszeniem (backend: CrmWebhook.php) w formacie
 * starej strony: { utm_source, utm_medium, utm_campaign }.
 */
export type Utm = { utm_source?: string; utm_medium?: string; utm_campaign?: string };

const STORAGE_KEY = "kgd_utm";
const KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/** Wywoływane przy każdym wejściu na stronę — nadpisuje zapis tylko, gdy adres faktycznie ma parametry UTM. */
export function captureUtm(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Utm = {};
    for (const key of KEYS) {
      const value = params.get(key)?.trim();
      if (value) utm[key] = value.slice(0, 200);
    }
    if (Object.keys(utm).length > 0) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch {
    // Brak dostępu do sessionStorage (tryb prywatny, blokada) — po prostu bez UTM.
  }
}

export function getUtm(): Utm | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Utm) : null;
  } catch {
    return null;
  }
}
