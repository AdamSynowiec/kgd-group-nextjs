import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type FeatureIconItem = { header: string; icon: string };

type FeaturesIconFields = {
  custom?: { sectionStyle?: string[]; itemStyle?: string[] };
  features?: EditableValue<FeatureIconItem[]> | FeatureIconItem[];
};

export default function FeaturesIcon({ fields }: { fields: FeaturesIconFields }) {
  const features = unwrap(fields.features) ?? [];
  const sectionCustomClass = fields.custom?.sectionStyle?.join(" ") ?? "";
  const itemCustomClass = fields.custom?.itemStyle?.join(" ") ?? "";

  return (
    <section className={sectionCustomClass}>
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-[24px] w-full sm:max-w-[414px] mx-auto md:max-w-full">
          {features.map((item) => (
            <div key={item.header} className={`py-8 md:py-[50px] lg:py-[50px] bg-[#303A3C] hover:opacity-[0.95] ${itemCustomClass}`}>
              <div className="mx-6 text-center flex flex-col items-center justify-center h-full">
                <img loading="lazy" decoding="async" src={item.icon} alt="" className="max-h-[60px]" />
                <span className="mt-[24px] block font-lato text-[18px] lg:text-[21px] text-[#FFFFFF] font-light">{item.header}</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
