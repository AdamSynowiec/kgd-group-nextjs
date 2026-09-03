import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import H4 from "./H4";
import A from "./A";

type FeatureAction = { link: { label: string; to: string; target?: string } };
type FeatureItem = { header: string; content: string; action?: FeatureAction };

type FeaturesFields = {
  custom?: { sectionStyle?: string[]; itemStyle?: string[] };
  features?: EditableValue<FeatureItem[]> | FeatureItem[];
};

export default function Features({ fields }: { fields: FeaturesFields }) {
  const features = unwrap(fields.features) ?? [];
  const sectionCustomClass = fields.custom?.sectionStyle?.join(" ") ?? "";
  const itemCustomClass = fields.custom?.itemStyle?.join(" ") ?? "";

  return (
    <section className={sectionCustomClass}>
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-[44px]">
          {features.map((item) => (
            <div key={item.header} className={`py-8 md:py-[50px] lg:py-[100px] bg-[#303A3C] ${itemCustomClass}`}>
              <div className="mx-6 md:mx-[68px]">
                <H4>{item.header}</H4>
                <span className="mt-[24px] block font-lato text-[18px]/[36px] lg:text-[21px] text-[#FFFFFF] font-light">{item.content}</span>
                {item.action && (
                  <div className="mt-[24px]">
                    <A link={item.action.link.to} label={item.action.link.label} target={item.action.link.target} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
