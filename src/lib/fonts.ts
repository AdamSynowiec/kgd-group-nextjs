import localFont from "next/font/local";
import { EB_Garamond, Playfair_Display, Lato, Libre_Caslon_Text, Roboto, Cormorant_Garamond, DM_Serif_Display, Manrope } from "next/font/google";
import { ranadeVariable, poppins, montserrat, homeFontVariables } from "./fonts-home";

// Ranade/Poppins/Montserrat są zdefiniowane w ./fonts-home (patrz komentarz tam) —
// reeksport, żeby istniejące importy z "@/lib/fonts" działały bez zmian.
export { ranadeVariable, poppins, montserrat, homeFontVariables };

/**
 * Loader fontów współdzielony przez strony inwestycji i stronę główną (nie
 * ładowane w root layout, żeby nie powiększać bundle'a generycznych stron
 * (site) jak /o-nas). Nazwy CSS-variable dobrane pod istniejące w portowanym
 * kodzie klasy Tailwind: font-ranade-variable, font-poppins,
 * font-ebgaramond-regular, font-playfairdisplay, font-lato, font-libre-caslon,
 * font-roboto, font-montserrat — patrz src/app/inwestycja/layout.tsx i
 * src/app/page.tsx. Dodanie fontu dla kolejnej strony jest addytywne, nie
 * wpływa na już renderowane.
 */

export const melodramaVariable = localFont({
  src: "../assets/fonts/Melodrama-Variable.woff2",
  variable: "--melodrama-src",
  display: "swap",
  preload: false,
});

export const ebGaramond = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--ebgaramond-src",
  display: "swap",
  preload: false,
});

export const playfairDisplay = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--playfairdisplay-src",
  display: "swap",
  preload: false,
});

export const lato = Lato({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "700", "900"],
  variable: "--lato-src",
  display: "swap",
  preload: false,
});

export const libreCaslonText = Libre_Caslon_Text({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--librecaslon-src",
  display: "swap",
  preload: false,
});

export const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
  variable: "--roboto-src",
  display: "swap",
  preload: false,
});

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--cormorant-src",
  display: "swap",
  preload: false,
});

// Fox Hills Residences (księga znaku): DM Serif Display — nagłówki, hasła, cytaty; Manrope — akapity i podpisy.
export const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--dmserif-src",
  display: "swap",
  preload: false,
});

export const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--manrope-src",
  display: "swap",
  preload: false,
});

export const investmentFontVariables = `${ranadeVariable.variable} ${melodramaVariable.variable} ${poppins.variable} ${ebGaramond.variable} ${playfairDisplay.variable} ${lato.variable} ${libreCaslonText.variable} ${roboto.variable} ${cormorantGaramond.variable} ${dmSerifDisplay.variable} ${manrope.variable}`;

