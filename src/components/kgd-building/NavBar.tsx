import { unwrap, type EditableValue } from "@/lib/editable";
import HomeNavBar from "@/components/home/NavBar";
import type { MenuItem } from "@/components/home/NavMenuItem";

type NavBarFields = {
  menu?: EditableValue<MenuItem[]> | MenuItem[];
  phone?: EditableValue<string> | string;
};

/** Ten sam NavBar co na stronie głównej (src/components/home/NavBar.tsx) — tu tylko własne menu/telefon strony i logo KGD Building; kotwice (#id) zostają na bieżącej stronie. */
export default function NavBar({ fields }: { fields: NavBarFields }) {
  return (
    <HomeNavBar
      logo="/investments/shared/kgd-building-logo.svg"
      menu={unwrap(fields.menu) ?? []}
      phone={unwrap(fields.phone) ?? ""}
      localAnchors
    />
  );
}
