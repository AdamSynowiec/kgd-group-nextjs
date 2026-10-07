import { unwrap, type EditableValue } from "@/lib/editable";
import EditorialHero from "@/components/shared/EditorialHero";
import { SocialIcon } from "./icons";

type Social = { href: string; label: string; icon: string };

type HeroFields = {
  bg?: EditableValue<string> | string;
  video?: EditableValue<boolean> | boolean;
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  scrollTo?: EditableValue<string> | string;
  scrollLabel?: EditableValue<string> | string;
  socials?: EditableValue<Social[]> | Social[];
};

const VIDEO_SRC = "/kgd-building/hero-bg.mp4";

/**
 * Ten sam Hero co na stronie głównej (src/components/shared/EditorialHero.tsx).
 * Ścieżka wideo zahardkodowana (nie pole "asset") — AssetEditor.tsx obsługuje
 * tylko obrazy; "video" jest zwykłym przełącznikiem bool, a "bg" posterem/zdjęciem.
 */
export default function Hero({ fields }: { fields: HeroFields }) {
  const socials = (unwrap(fields.socials) ?? []).map((social) => ({
    href: social.href,
    label: social.label,
    icon: <SocialIcon icon={social.icon} />,
  }));

  return (
    <EditorialHero
      heading={unwrap(fields.header) ?? ""}
      lead={unwrap(fields.subHeader)}
      video={unwrap(fields.video) ? VIDEO_SRC : undefined}
      poster={unwrap(fields.bg)}
      scrollTo={unwrap(fields.scrollTo)}
      scrollLabel={unwrap(fields.scrollLabel)}
      socials={socials}
    />
  );
}
