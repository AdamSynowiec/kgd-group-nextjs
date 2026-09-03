import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import Button from "./Button";
import H1 from "./H1";
import P from "./P";

type HeroFields = {
  image: { url: string };
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  primaryButtonLabel?: EditableValue<string> | string;
  secondaryButtonLabel?: EditableValue<string> | string;
  phone?: EditableValue<string> | string;
};

export default function Hero({ fields }: { fields: HeroFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const primaryButtonLabel = unwrap(fields.primaryButtonLabel);
  const secondaryButtonLabel = unwrap(fields.secondaryButtonLabel);
  const phone = unwrap(fields.phone);

  return (
    <div className="relative min-h-svh bg-cover bg-center" style={{ backgroundImage: `url(${fields.image?.url})` }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(80, 67, 41, 0.41) 50%, rgba(0, 0, 0, 0) 100%)" }}
      />

      <div className="relative z-10">
        <Container>
          <div className="min-h-svh pt-[150px] flex flex-col items-start justify-center !max-w-[1024px]">
            <H1 className="text-white mb-[24px]">{header}</H1>
            {subHeader && <P className="text-white">{subHeader}</P>}

            <div className="flex flex-col md:flex-row gap-[24px] mt-[24px] w-full md:w-auto">
              {primaryButtonLabel && (
                <a href="#oferta">
                  <Button type="primary" value={primaryButtonLabel} />
                </a>
              )}
              {secondaryButtonLabel && phone && (
                <a href={`tel:${phone}`}>
                  <Button type="secondary" value={secondaryButtonLabel} />
                </a>
              )}
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
