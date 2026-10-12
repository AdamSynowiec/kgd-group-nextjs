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

/** Ciemny basemap ("dark_all") — mapa inwestycji FOXHILLS (src/components/investments/foxhills/Map.tsx). Ten sam klucz API. */
export const CARTO_DARK_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" +
  (CARTO_API_KEY ? `?key=${encodeURIComponent(CARTO_API_KEY)}` : "");

/**
 * Basemap "voyager" (jasna, kolorowa, czytelne drogi) — mapa inwestycji FOXHILLS. Osobny klucz API niż pozostałe mapy;
 * działa na każdej domenie (produkcja, test, localhost). Atrybucja zgodnie z wymaganiami Carto/OSM.
 */
const CARTO_VOYAGER_API_KEY = "cb1_4hx1_1_1570aeef1d988db1d6765656";

export const CARTO_VOYAGER_TILE_URL = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_VOYAGER_API_KEY)}`;

export const CARTO_VOYAGER_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
