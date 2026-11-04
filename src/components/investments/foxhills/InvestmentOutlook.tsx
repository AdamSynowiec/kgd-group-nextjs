"use client";

import { unwrap, type EditableValue } from "@/lib/editable";
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
  const image = unwrap(fields.image);
  const imageAlt = unwrap(fields.imageAlt) ?? header ?? "";

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
        {/* Nagłówek "Inwestycja z perspektywą" z opisem i blok "Partner zarządzający najmem" usunięte ze strony na prośbę klienta (pola zostają w bazie). */}
      </Container>
    </section>
  );
}
