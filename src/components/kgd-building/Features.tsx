import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import Card from "./Card";

type FeatureItem = { icon: string; header: string };

type FeaturesFields = {
  items?: EditableValue<FeatureItem[]> | FeatureItem[];
};

/** Pasek ikon (icon + header) jako dzielona siatka z ramką — jak Highlights w /wykonczenie-pod-klucz. */
export default function Features({ fields }: { fields: FeaturesFields }) {
  const items = unwrap(fields.items) ?? [];

  return (
    <section className="bg-white py-16 md:py-20 font-poppins">
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/[0.08] border border-black/[0.08]">
          {items.map((item, index) => (
            <Card key={item.header} icon={item.icon} header={item.header} delay={index * 80} />
          ))}
        </div>
      </Container>
    </section>
  );
}
