import { unwrap, type EditableValue } from "@/lib/editable";
import Card from "./Card";

type FeatureItem = { icon: string; header: string };

type FeaturesFields = {
  items?: EditableValue<FeatureItem[]> | FeatureItem[];
};

/** Mirror kgd-building/Features.jsx — pasek 4 ikon (bez treści, tylko icon+header). */
export default function Features({ fields }: { fields: FeaturesFields }) {
  const items = unwrap(fields.items) ?? [];

  return (
    <section className="pt-10 md:pt-16 grid grid-cols-2 lg:grid-cols-4 w-full gap-1 divide-x divide-[#eee] font-poppins">
      {items.map((item, index) => (
        <Card key={item.header} icon={item.icon} header={item.header} delay={100 + index * 50} className={index === 0 ? "border-b" : ""} />
      ))}
    </section>
  );
}
