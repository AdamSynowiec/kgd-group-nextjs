import { unwrap, type EditableValue } from "@/lib/editable";
import EditorialHero from "@/components/shared/EditorialHero";

type HeroFields = {
  eyebrow?: EditableValue<string> | string;
  heading: EditableValue<string> | string;
  lead?: EditableValue<string> | string;
  video?: EditableValue<string> | string;
  bg?: EditableValue<string> | string;
};

/** Ten sam Hero co na stronie głównej (src/components/shared/EditorialHero.tsx) — wideo w tle + poster "bg". */
export default function Hero({ fields }: { fields: HeroFields }) {
  return (
    <EditorialHero
      eyebrow={unwrap(fields.eyebrow)}
      heading={unwrap(fields.heading) ?? ""}
      lead={unwrap(fields.lead)}
      video={unwrap(fields.video)}
      poster={unwrap(fields.bg)}
      scrollTo="#przewagi"
    />
  );
}
