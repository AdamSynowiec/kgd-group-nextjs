import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type HeroFields = {
  eyebrow?: EditableValue<string> | string;
  heading: EditableValue<string> | string;
  lead?: EditableValue<string> | string;
  bg?: EditableValue<string> | string;
};

/** Hero bez wideo/zdjęcia (brak jeszcze realnych fotografii — patrz TODO w treści strony); pole "bg" gotowe na podmianę w adminie. */
export default function Hero({ fields }: { fields: HeroFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const heading = unwrap(fields.heading);
  const lead = unwrap(fields.lead);
  const bg = unwrap(fields.bg);

  return (
    <section className="relative bg-[#141414] overflow-hidden font-poppins pt-[140px] pb-20 md:pt-[220px] md:pb-28">
      {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,171,139,0.18),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.15),rgba(0,0,0,0.78))]" />

      <Container className="relative z-10 text-center max-w-3xl mx-auto text-white">
        {eyebrow && <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B]">{eyebrow}</span>}
        <h1 className="mt-4 text-[32px] md:text-[52px] leading-tight font-light">{heading}</h1>
        {lead && <p className="mt-6 text-white/80 text-[17px] md:text-[20px] leading-relaxed font-light">{lead}</p>}
      </Container>
    </section>
  );
}
