/**
 * Adres publicznego API backendu (backend/index.php) widziany z PRZEGLĄDARKI —
 * dla formularzy strony (kontakt, szybki kontakt). Domyślnie względne "/api",
 * bo statyczna strona i backend żyją pod tą samą domeną (ta sama zasada co
 * adminBaseUrl() w src/lib/adminApi.ts); NEXT_PUBLIC_API_BASE_URL nadpisuje
 * to tylko, gdy backend jest gdzie indziej (np. dev lokalny).
 */
export function publicApiUrl(route: string): string {
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api").replace(/\/+$/, "");
  return `${base}/index.php?${new URLSearchParams({ route }).toString()}`;
}
