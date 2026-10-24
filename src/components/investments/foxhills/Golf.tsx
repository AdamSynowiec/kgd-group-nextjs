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

const H2 = "whitespace-pre-line font-dmserif text-[34px] font-medium leading-[1.08] tracking-[0.01em] text-[#E7E7E7] sm:text-[46px] lg:text-[48px] xl:text-[56px]";
const P = "whitespace-pre-line text-[15px] font-light leading-[1.9] text-[#E7E7E7]/70 sm:text-[17px]";

/**
 * "Wyjątkowe miejsce. Wyjątkowa gra." (katalog, str. 7–8) — pole golfowe Krakow Valley:
 * zdjęcie golfisty o zachodzie obok nagłówka z logo pola, "Rodzinne chwile" w odwróconym układzie,
 * na końcu mozaika trzech zdjęć i hasło "Sport który łączy pokolenia".
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
    <section id={id ?? "golf"} className="relative scroll-mt-20 overflow-hidden bg-[#171A1C] py-24 font-manrope sm:py-32 lg:py-40">
      <div className="pointer-events-none absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-[#C98A3B]/10 blur-[160px]" />

      <Container className="relative">
        {/* Wyjątkowe miejsce. Wyjątkowa gra. */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            {logo && <img src={logo} alt={logoAlt} loading="lazy" decoding="async" className="mb-10 h-20 w-auto sm:h-24" />}
            {header && <h2 className={H2}>{header}</h2>}
            <span className="mt-8 block h-px w-16 bg-[#BCC0C1]/70" />
            {text && <p className={`${P} mt-8 max-w-xl`}>{text}</p>}
          </Reveal>
          {image && (
            <Reveal delay={0.1}>
              <div className="relative aspect-[4/5] overflow-hidden">
                <img src={image} alt={imageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171A1C]/50 via-transparent to-transparent" />
              </div>
            </Reveal>
          )}
        </div>

        {/* Rodzinne chwile w najlepszym wydaniu. */}
        {(familyHeader || familyText) && (
          <div className="mt-24 grid items-center gap-12 sm:mt-32 lg:mt-40 lg:grid-cols-2 lg:gap-20">
            {familyImage && (
              <Reveal className="order-2 lg:order-1">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img src={familyImage} alt={familyImageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-bottom" />
                </div>
              </Reveal>
            )}
            <Reveal delay={0.1} className="order-1 lg:order-2">
              {familyHeader && <h2 className={H2}>{familyHeader}</h2>}
              <span className="mt-8 block h-px w-16 bg-[#BCC0C1]/70" />
              {familyText && <p className={`${P} mt-8 max-w-md`}>{familyText}</p>}
            </Reveal>
          </div>
        )}

        {/* Mozaika + Sport który łączy pokolenia. */}
        {mainPhoto && (
          <div className="mt-24 grid gap-4 sm:mt-32 lg:mt-40 lg:grid-cols-[7fr_5fr]">
            <Reveal className={`relative min-h-[280px] overflow-hidden sm:min-h-[420px] ${sidePhotos.length > 1 ? "lg:row-span-2" : ""}`}>
              <img src={mainPhoto.image} alt={mainPhoto.alt ?? ""} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            </Reveal>
            {sidePhotos.map((photo, index) => (
              <Reveal key={`${photo.image}-${index}`} delay={0.08 * (index + 1)} className="relative aspect-[16/10] overflow-hidden">
                <img src={photo.image} alt={photo.alt ?? ""} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </Reveal>
            ))}
          </div>
        )}

        {(generationsHeader || generationsText) && (
          <Reveal className="mt-14 sm:mt-20">
            {generationsHeader && (
              <h3 className="whitespace-pre-line font-dmserif text-[28px] leading-[1.15] tracking-[0.02em] text-[#E7E7E7] sm:text-[38px] lg:text-[44px]">{generationsHeader}</h3>
            )}
            <span className="mt-6 block h-px w-16 bg-[#C98A3B]/80" />
            {generationsText && <p className={`${P} mt-6`}>{generationsText}</p>}
          </Reveal>
        )}
      </Container>
    </section>
  );
}
