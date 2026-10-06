import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type FeatureImageFields = {
  img?: EditableValue<string> | string;
  eyebrow?: EditableValue<string> | string;
  title: EditableValue<string> | string;
  subtitle?: EditableValue<string> | string;
};

/**
 * Pełnoszerokie zdjęcie z podpisem — wizualny "oddech" w środku długiej,
 * tekstowej strony (mirror src/components/kgd-building/FeatureImage.tsx).
 * Bez zdjęcia (brak jeszcze realnych fotografii — patrz TODO w treści strony)
 * renderuje elegancki placeholder w stylistyce Hero (blask + ukośny wzór),
 * gotowy na podmianę w adminie (pole "img", type "asset").
 */
export default function FeatureImage({ fields }: { fields: FeatureImageFields }) {
  const img = unwrap(fields.img);
  const eyebrow = unwrap(fields.eyebrow);
  const title = unwrap(fields.title);
  const subtitle = unwrap(fields.subtitle);

  return (
    <section className="relative h-[60vh] md:h-[82vh] overflow-hidden font-poppins bg-[#141414]">
      {img ? (
        <img src={img} alt={typeof title === "string" ? title : ""} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <>
          <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-[#C9AB8B]/15 blur-[140px]" />
          <div className="absolute -bottom-40 -right-20 h-[420px] w-[420px] rounded-full bg-[#C9AB8B]/10 blur-[140px]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "repeating-linear-gradient(135deg, #C9AB8B 0, #C9AB8B 1px, transparent 1px, transparent 64px)" }}
          />
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/45" />

      <Container className="relative z-10 h-full flex flex-col justify-end pb-16 md:pb-20 text-white">
        {eyebrow && (
          <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9AB8B]" />
            {eyebrow}
          </span>
        )}
        <h2 className="mt-4 font-ranade-variable font-light text-[32px] md:text-[56px] leading-[1.05] max-w-2xl">{title}</h2>
        {subtitle && <p className="mt-4 max-w-xl text-white/75 font-light leading-relaxed">{subtitle}</p>}
      </Container>
    </section>
  );
}
