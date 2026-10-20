import localFont from "next/font/local";
import { Poppins, Montserrat } from "next/font/google";

/**
 * Fonty strony głównej (i bloga) — osobny moduł, bo next/font preloaduje
 * KAŻDY font zdefiniowany w zaimportowanym module. Gdy strona główna
 * importowała src/lib/fonts.ts, dostawała <link rel="preload"> dla wszystkich
 * 11 rodzin z inwestycji (~42 pliki, ~860 KB) — choć używa tylko trzech.
 * src/lib/fonts.ts reeksportuje stąd ranadeVariable/poppins, więc strony
 * inwestycji korzystają z tych samych definicji (te same nazwy CSS-variable).
 *
 * Preload tylko dla Ranade (nagłówek Hero, widoczny od razu). Poppins i
 * Montserrat pobierają się normalnie, gdy CSS ich użyje (display: "swap"
 * + automatyczny fallback next/font = tekst widać od razu, bez skoku układu).
 */

export const ranadeVariable = localFont({
  src: "../assets/fonts/Ranade-Variable.woff2",
  variable: "--ranade-variable-src",
  display: "swap",
});

export const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--poppins-src",
  display: "swap",
  preload: false,
});

// Montserrat występuje tylko w akapitach strony głównej (src/components/home/P.tsx, font-light),
// więc tylko waga 300: 18 + 31 KB zamiast 37 + 69 KB pliku zmiennego 100–900 (latin + latin-ext),
// które stały na ścieżce krytycznej (HTML → CSS → font). Inna waga Montserrata = dopisać ją tutaj.
export const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: "300",
  variable: "--montserrat-src",
  display: "swap",
  preload: false,
});

// Ranade — nagłówek wspólnego Hero (src/components/shared/EditorialHero.tsx).
export const homeFontVariables = `${ranadeVariable.variable} ${poppins.variable} ${montserrat.variable}`;
