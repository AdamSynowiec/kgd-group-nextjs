import { unwrap, type EditableValue } from "@/lib/editable";

type FeatureImageFields = {
  img: EditableValue<string> | string;
  title: EditableValue<string> | string;
  subtitle?: EditableValue<string> | string;
};

/** Mirror FeatureImage.jsx (kgd-group/components/layout) — pełnoszerokie zdjęcie z podpisem, użyte 2x w Deweloper.jsx. */
export default function FeatureImage({ fields }: { fields: FeatureImageFields }) {
  const img = unwrap(fields.img);
  const title = unwrap(fields.title);
  const subtitle = unwrap(fields.subtitle);

  return (
    <section className="relative h-[50vh] md:h-[70vh] overflow-hidden font-poppins">
      <img src={img} alt={title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-6">
        <h2 className="text-2xl md:text-4xl font-light max-w-2xl">{title}</h2>
        {subtitle && <p className="mt-4 max-w-xl text-white/85 font-light">{subtitle}</p>}
      </div>
    </section>
  );
}
