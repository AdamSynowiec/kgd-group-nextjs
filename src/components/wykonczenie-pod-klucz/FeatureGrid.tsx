import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Item = { title: string; text: string };

type FeatureGridFields = {
  header: EditableValue<string> | string;
  items?: EditableValue<Item[]> | Item[];
  tint?: EditableValue<boolean> | boolean;
};

/** Siatka numerowanych kafelków — "Pełny zakres" / "Co zyskujesz" (jeden komponent, dwa razy na stronie). */
export default function FeatureGrid({ fields }: { fields: FeatureGridFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];
  const tint = unwrap(fields.tint);

  return (
    <section className={`py-16 md:py-20 font-poppins ${tint ? "bg-[#FBFBFB]" : ""}`}>
      <Container>
        <h2 className="text-center text-2xl md:text-4xl font-light">{header}</h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="group rounded-md bg-white border border-[#eee] p-6 lg:p-8 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] text-sm font-medium">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-lg font-light">{item.title}</h3>
              <p className="mt-2 text-sm text-[#4a4a4a] font-light leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
