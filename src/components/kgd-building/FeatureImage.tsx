import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type FeatureImageFields = {
  img: EditableValue<string> | string;
  title: EditableValue<string> | string;
  subtitle?: EditableValue<string> | string;
};

/** Pełnoszerokie zdjęcie z podpisem wyrównanym do dołu-lewej (jak FeatureImage w /wykonczenie-pod-klucz), bez slidera. */
export default function FeatureImage({ fields }: { fields: FeatureImageFields }) {
  const img = unwrap(fields.img);
  const title = unwrap(fields.title);
  const subtitle = unwrap(fields.subtitle);

  return (
    <section className="relative h-[60svh] md:h-[75svh] overflow-hidden bg-[#141414] font-poppins">
      <img src={img} alt={title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
      <Container className="absolute inset-x-0 bottom-0 pb-12 md:pb-16 text-white">
        <span className="block h-[3px] w-14 bg-[#C9AB8B]" />
        <h2 className="mt-5 font-ranade-variable font-light text-[30px] md:text-[56px] leading-[1.05] max-w-3xl">{title}</h2>
        {subtitle && <p className="mt-4 max-w-xl text-white/75 font-light leading-relaxed">{subtitle}</p>}
      </Container>
    </section>
  );
}
