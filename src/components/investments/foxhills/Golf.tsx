"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Container, Reveal } from "./ui";

type GolfPhoto = { image: string; alt?: string };

type GolfFields = {
  logo?: EditableValue<string> | string;
  logoAlt?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  image?: EditableValue<string> | string;
  imageAlt?: EditableValue<string> | string;
  familyHeader?: EditableValue<string> | string;
  familyText?: EditableValue<string> | string;
  familyImage?: EditableValue<string> | string;
  familyImageAlt?: EditableValue<string> | string;
  photos?: EditableValue<GolfPhoto[]> | GolfPhoto[];
  generationsHeader?: EditableValue<string> | string;
  generationsText?: EditableValue<string> | string;
};

const H2 = "whitespace-pre-line font-dmserif text-[32px] font-medium leading-[1.1] tracking-[0.01em] text-[#E7E7E7] sm:text-[42px] xl:text-[50px]";
const P = "whitespace-pre-line text-[15px] font-light leading-[1.9] text-[#E7E7E7]/70 sm:text-[17px]";
const LINE = "mt-7 block h-px w-16 bg-[#BCC0C1]/70";
const ZOOM = "transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]";

/** Zdjęcie w kadrze z przesuniętą cienką ramką — na telefonie poziome, od lg pionowe o stałej szerokości kolumny. */
function FramedPhoto({ src, alt, frame, className = "" }: { src: string; alt: string; frame: "left" | "right"; className?: string }) {
  return (
    <div className="group relative">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 hidden border border-[#BCC0C1]/25 lg:block ${frame === "right" ? "translate-x-4 translate-y-4" : "-translate-x-4 translate-y-4"}`}
      />
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/10] lg:aspect-[4/5]">
        <img src={src} alt={alt} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${ZOOM} ${className}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C]/45 via-transparent to-transparent" />
      </div>
    </div>
  );
}

/**
 * "Wyjątkowe miejsce. Wyjątkowa gra." (katalog, str. 7–8) — pole golfowe Krakow Valley:
 * nagłówek z logo pola obok zdjęcia golfisty, "Rodzinne chwile" w odwróconym układzie,
 * na końcu hasło "Sport który łączy pokolenia" nad jednym rzędem zdjęć.
 * Treść trzyma się węższej kolumny (1280px) niż reszta strony, a zdjęcia mają stałą szerokość —
 * na szerokich ekranach sekcja nie rośnie w nieskończoność.
 * Nagłówki i opisy łamią wiersze w miejscach "\n" z panelu.
 */
export default function Golf({ fields, id }: { fields: GolfFields; id?: string }) {
  const logo = unwrap(fields.logo);
  const logoAlt = unwrap(fields.logoAlt) ?? "";
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const image = unwrap(fields.image);
  const imageAlt = unwrap(fields.imageAlt) ?? "";
  const familyHeader = unwrap(fields.familyHeader);
  const familyText = unwrap(fields.familyText);
  const familyImage = unwrap(fields.familyImage);
  const familyImageAlt = unwrap(fields.familyImageAlt) ?? "";
  const photos = (unwrap(fields.photos) ?? []).filter((photo) => photo.image);
  const generationsHeader = unwrap(fields.generationsHeader);
  const generationsText = unwrap(fields.generationsText);
  const [mainPhoto, ...sidePhotos] = photos;

  return (
    <section id={id ?? "golf"} className="relative scroll-mt-20 overflow-hidden bg-[#171A1C] py-20 font-manrope sm:py-28 lg:py-32">
      <div className="pointer-events-none absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-[#C98A3B]/10 blur-[160px]" />

      <Container className="relative">
        <div className="mx-auto max-w-[1280px]">
          {/* Wyjątkowe miejsce. Wyjątkowa gra. */}
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-20">
            <Reveal>
              {logo && <img src={logo} alt={logoAlt} loading="lazy" decoding="async" className="mb-8 h-16 w-auto sm:h-20" />}
              {header && <h2 className={H2}>{header}</h2>}
              <span className={LINE} />
              {text && <p className={`${P} mt-7 max-w-xl`}>{text}</p>}
            </Reveal>
            {image && (
              <Reveal delay={0.1}>
                <FramedPhoto src={image} alt={imageAlt} frame="right" className="object-[50%_35%]" />
              </Reveal>
            )}
          </div>

          {/* Rodzinne chwile w najlepszym wydaniu. */}
          {(familyHeader || familyText) && (
            <div className="mt-20 grid items-center gap-10 sm:mt-24 lg:mt-28 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-20">
              {familyImage && (
                <Reveal className="order-2 lg:order-1">
                  <FramedPhoto src={familyImage} alt={familyImageAlt} frame="left" className="object-bottom" />
                </Reveal>
              )}
              <Reveal delay={0.1} className="order-1 lg:order-2">
                {familyHeader && <h2 className={H2}>{familyHeader}</h2>}
                <span className={LINE} />
                {familyText && <p className={`${P} mt-7 max-w-md`}>{familyText}</p>}
              </Reveal>
            </div>
          )}

          {/* Sport który łączy pokolenia + jeden rząd zdjęć. */}
          {(generationsHeader || generationsText) && (
            <Reveal className="mt-20 grid gap-6 sm:mt-24 lg:mt-28 lg:grid-cols-2 lg:items-end lg:gap-20">
              <div>
                {generationsHeader && (
                  <h3 className="whitespace-pre-line font-dmserif text-[28px] leading-[1.15] tracking-[0.02em] text-[#E7E7E7] sm:text-[36px] xl:text-[42px]">{generationsHeader}</h3>
                )}
                <span className="mt-6 block h-px w-16 bg-[#C98A3B]/80" />
              </div>
              {generationsText && <p className={`${P} lg:pb-1`}>{generationsText}</p>}
            </Reveal>
          )}

          {mainPhoto && (
            <div className={`grid grid-cols-2 gap-3 sm:gap-4 lg:flex lg:h-[380px] ${generationsHeader || generationsText ? "mt-10 sm:mt-12" : "mt-20 sm:mt-24 lg:mt-28"}`}>
              <Reveal className="group relative col-span-2 aspect-[16/10] overflow-hidden lg:aspect-auto lg:flex-[1.6]">
                <img src={mainPhoto.image} alt={mainPhoto.alt ?? ""} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${ZOOM}`} />
              </Reveal>
              {sidePhotos.map((photo, index) => {
                // Nieparzysta liczba bocznych zdjęć — ostatnie na telefonie na całą szerokość, bez dziury w siatce.
                const wide = sidePhotos.length % 2 === 1 && index === sidePhotos.length - 1;
                return (
                  <Reveal
                    key={`${photo.image}-${index}`}
                    delay={0.08 * (index + 1)}
                    className={`group relative overflow-hidden lg:aspect-auto lg:flex-1 ${wide ? "col-span-2 aspect-[16/10]" : "aspect-[4/3]"}`}
                  >
                    <img src={photo.image} alt={photo.alt ?? ""} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-cover ${ZOOM}`} />
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
