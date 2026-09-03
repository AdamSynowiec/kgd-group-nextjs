import localFont from "next/font/local";
import { Poppins, EB_Garamond } from "next/font/google";

/**
 * Fonty specyficzne dla stron inwestycji (nie ładowane w root layout / (site),
 * żeby nie powiększać bundle'a głównej strony). Nazwy CSS-variable dobrane
 * pod istniejące w portowanym kodzie klasy Tailwind: font-ranade-variable,
 * font-poppins, font-ebgaramond-regular — patrz src/app/inwestycja/layout.tsx.
 */

export const ranadeVariable = localFont({
  src: "../../assets/fonts/Ranade-Variable.woff2",
  variable: "--ranade-variable-src",
  display: "swap",
});

export const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--poppins-src",
  display: "swap",
});

export const ebGaramond = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--ebgaramond-src",
  display: "swap",
});

export const investmentFontVariables = `${ranadeVariable.variable} ${poppins.variable} ${ebGaramond.variable}`;
