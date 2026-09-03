import { unwrap, type EditableValue } from "@/lib/editable";
import H2 from "./H2";
import Button from "./Button";

type FeatureLine = { item: string };

type OffertFields = {
  image: EditableValue<string> | string;
  localization?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  features?: EditableValue<FeatureLine[]> | FeatureLine[];
  price?: EditableValue<string> | string;
  pricem2: EditableValue<string> | string;
  area: EditableValue<string> | string;
  priceLabel?: EditableValue<string> | string;
  pdfUrl?: EditableValue<string> | string;
  pdfButtonLabel?: EditableValue<string> | string;
};

const formatPLN = (value: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export default function Offert({ fields }: { fields: OffertFields }) {
  const image = unwrap(fields.image);
  const localization = unwrap(fields.localization);
  const header = unwrap(fields.header);
  const features = unwrap(fields.features) ?? [];
  const priceLabel = unwrap(fields.priceLabel);
  const pricem2 = Number(unwrap(fields.pricem2));
  const area = Number(unwrap(fields.area));
  const pdfUrl = unwrap(fields.pdfUrl);
  const pdfButtonLabel = unwrap(fields.pdfButtonLabel);

  return (
    <div id="oferta">
      <div className="grid grid-cols-1 lg:grid-cols-2 md:mr-4">
        <div>
          <img loading="lazy" decoding="async" src={image} alt="" className="w-full h-full object-cover" />
        </div>

        <div className="md:max-w-[864px] pl-4 md:pl-[50px] xl:pl-[159px] py-[50px] md:py-[100px] mr-4 md:mr-0">
          {localization && <span className="block font-playfairdisplay text-[18px] md:text-[24px] text-[#3D3D3D]">{localization}</span>}

          <H2>{header}</H2>

          <ul className="mt-[24px] md:mt-[48px] space-y-[12px] md:space-y-[24px]">
            {features.map((item) => (
              <li key={item.item} className="font-lato text-[18px] md:text-[24px] font-light text-[#707070]">
                {item.item}
              </li>
            ))}
          </ul>

          <div className="text-right mt-[50px]">
            <div className="flex flex-row items-end justify-end gap-[12px]">
              {priceLabel && <span className="block pb-2">{priceLabel}</span>}
              <H2 className="!text-[#975F3C]">{formatPLN(pricem2 * area)}</H2>
            </div>
            <span>
              {formatPLN(pricem2)} / m<sup>2</sup>
            </span>
          </div>

          {pdfUrl && pdfButtonLabel && (
            <div className="md:max-w-[240px]">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Button type="primary" value={pdfButtonLabel} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
