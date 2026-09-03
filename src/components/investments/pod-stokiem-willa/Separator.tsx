type SeparatorFields = {
  custom?: { style?: string[] };
};

export default function Separator({ fields }: { fields: SeparatorFields }) {
  const customClass = fields.custom?.style?.join(" ") ?? "";

  return <div className={`h-[50px] lg:h-[100px] ${customClass}`} />;
}
