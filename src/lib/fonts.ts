import localFont from "next/font/local";
import { Poppins, EB_Garamond, Playfair_Display, Lato, Libre_Caslon_Text, Roboto, Montserrat } from "next/font/google";

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
});

export const ebGaramond = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--ebgaramond-src",
  display: "swap",
});

export const playfairDisplay = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--playfairdisplay-src",
  display: "swap",
});

export const lato = Lato({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "700", "900"],
  variable: "--lato-src",
  display: "swap",
});

export const libreCaslonText = Libre_Caslon_Text({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--librecaslon-src",
  display: "swap",
});

export const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
  variable: "--roboto-src",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--montserrat-src",
  display: "swap",
});

export const investmentFontVariables = `${ranadeVariable.variable} ${poppins.variable} ${ebGaramond.variable} ${playfairDisplay.variable} ${lato.variable} ${libreCaslonText.variable} ${roboto.variable}`;

export const homeFontVariables = `${poppins.variable} ${montserrat.variable}`;
