/**
 * Adres kafelków CARTO (basemap "light_all") z kluczem API.
 * Klucz pochodzi z NEXT_PUBLIC_CARTO_API_KEY (wbudowywany w build – ustaw w
 * .env.local oraz w GitHub Actions). Bez klucza mapa działa jak dotychczas.
 */
const CARTO_API_KEY = "cb1_3s1c_1_75ade42129da50ea88d13d51";

export const CARTO_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" +
  (CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : "");

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://carto.com/">Carto</a>';
