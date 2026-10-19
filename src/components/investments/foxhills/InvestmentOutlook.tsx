"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
import { Icon } from "./icons";
import { Container, Reveal } from "./ui";

type InvestmentOutlookFields = {
  header?: EditableValue<string> | string;
  accent?: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  image?: EditableValue<string> | string;
  imageAlt?: EditableValue<string> | string;
  partnerHeader?: EditableValue<string> | string;
  partnerText?: EditableValue<string> | string;
  partnerImage?: EditableValue<string> | string;
  partnerImageAlt?: EditableValue<string> | string;
};

/**
 * "Inwestycja z perspektywą" (katalog, str. 19): szeroka wizualizacja wnętrza, pod nią nagłówek i opis
 * w dwóch kolumnach, a na końcu blok "Partner zarządzający najmem" — zdjęcie osiedla obok ciemnego panelu.
 */
export default function InvestmentOutlook({ fields, id }: { fields: InvestmentOutlookFields; id?: string }) {
  const header = unwrap(fields.header);
  const accent = unwrap(fields.accent);
  const text = unwrap(fields.text);
  const image = unwrap(fields.image);
  const imageAlt = unwrap(fields.imageAlt) ?? header ?? "";
  const partnerHeader = unwrap(fields.partnerHeader);
  const partnerText = unwrap(fields.partnerText);
  const partnerImage = unwrap(fields.partnerImage);
  const partnerImageAlt = unwrap(fields.partnerImageAlt) ?? partnerHeader ?? "";

  return (
    <section id={id ?? "perspektywa"} className="relative scroll-mt-20 overflow-hidden bg-[#F7F7F7] py-24 font-manrope sm:py-32 lg:py-40">
      <Container>
        {image && (
          <Reveal>
            <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[21/9]">
              <img src={image} alt={imageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </Reveal>
        )}

        <div className="mt-14 grid gap-8 sm:mt-20 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="font-dmserif text-[38px] font-medium leading-[1.05] tracking-[-0.01em] text-[#171A1C] sm:text-[52px] lg:text-[64px]">
              {header}
              {accent && <span className="mt-1 block font-dmserif text-[0.78em] font-light italic tracking-normal text-[#555859]">{accent}</span>}
            </h2>
          </Reveal>
          {text && (
            <Reveal delay={0.1} className="lg:pt-4">
              <span className="block h-px w-12 bg-[#555859]/60" />
              <p className="mt-6 max-w-xl text-[16px] font-light leading-[1.9] text-[#171A1C]/70 sm:text-[18px]">{text}</p>
            </Reveal>
          )}
        </div>

        {(partnerHeader || partnerText) && (
          <div className="mt-20 grid overflow-hidden sm:mt-28 lg:grid-cols-[7fr_5fr]">
            {partnerImage && (
              <Reveal className="relative min-h-[300px] lg:min-h-[520px]">
                <img src={partnerImage} alt={partnerImageAlt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </Reveal>
            )}
            <Reveal delay={0.1} className="h-full">
              <div className="flex h-full flex-col justify-center bg-[#171A1C] px-8 py-14 sm:px-14 lg:py-20">
                {partnerHeader && (
                  <h3 className="whitespace-pre-line font-dmserif text-[30px] leading-[1.25] tracking-[0.04em] text-[#E7E7E7] sm:text-[36px]">{partnerHeader}</h3>
                )}
                <span className="mt-8 block h-px w-16 bg-[#BCC0C1]/70" />
                <Icon name="handshake" className="mt-8 h-12 w-12 text-[#BCC0C1]" strokeWidth={1} />
                {partnerText && <p className="mt-8 max-w-md text-[15px] font-light leading-[1.9] text-[#E7E7E7]/70 sm:text-[16px]">{partnerText}</p>}
              </div>
            </Reveal>
          </div>
        )}
      </Container>
    </section>
  );
}
