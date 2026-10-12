import FeatureImage from "./FeatureImage";

type PressFeatureProps = {
  image?: string;
  title?: string;
  text?: string;
  link?: string;
};

/**
 * „W mediach” (publikacja w Forbes Polska) — pod sponsoringiem na stronie głównej. To ten sam pływający baner co pozostałe
 * na stronie (FeatureImage): zdjęcie w zaokrąglonej ramce na beżowej bryle, tytuł na białej kartce i tekst po prawej.
 */
export default function PressFeature({ image, title, text, link }: PressFeatureProps) {
  if (!image || !title) return null;

  return (
    <>
      <div id="w_mediach" />
      <FeatureImage src={image} title={title} subtitle={text ?? ""} link={link || undefined} />
    </>
  );
}
