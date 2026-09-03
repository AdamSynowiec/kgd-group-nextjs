import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type CtaFields = {
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  phone: EditableValue<string> | string;
};

export default function Cta({ fields }: { fields: CtaFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const phone = unwrap(fields.phone);

  return (
    <section
      className="min-h-svh"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(29, 29, 29, 1) 31%, rgba(0, 0, 0, 0) 100%), url(/investments/rudava-park/rudava-park-wizualizacja-07.webp)",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Container>
        <div className="pt-[50px] md:pt-[100px] text-center">
          <h2 className="font-ranade-variable text-[#FCFCFC] text-[32px] md:text-[64px] mb-[24px]">{header}</h2>
          {subHeader && <p className="font-ranade-variable font-thin text-[#FCFCFC] text-[18px] md:text-[24px]">{subHeader}</p>}

          {phone && (
            <div className="mt-[120px] flex items-center justify-center w-full">
              <a
                href={`tel:${phone}`}
                className="bg-white py-[12px] md:py-0 md:h-[100px] max-w-[500px] w-full rounded-[20px] flex items-center px-[10px] shadow-xl cursor-pointer transform transition duration-300 ease-out hover:scale-105"
              >
                <img
                  loading="lazy"
                  decoding="async"
                  src="/investments/rudava-park/phone-icon.svg"
                  alt="Telefon"
                  className="w-[40px] md:w-[80px] h-[40px] md:h-[80px]"
                />
                <span className="font-ranade-variable font-thin text-[24px] md:text-[32px] font-medium text-[#2A2A2A] w-full">{phone}</span>
              </a>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
