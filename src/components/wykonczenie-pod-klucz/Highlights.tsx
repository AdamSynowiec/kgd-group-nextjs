import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { AwardIcon, LayersIcon, UsersIcon, TagIcon } from "./icons";

type Highlight = { icon: string; header: string; content: string };

type HighlightsFields = {
  header?: EditableValue<string> | string;
  items?: EditableValue<Highlight[]> | Highlight[];
};

const iconMap: Record<string, typeof AwardIcon> = { award: AwardIcon, layers: LayersIcon, users: UsersIcon, tag: TagIcon };

/** Pasek "przewag" KGD — 4 kafelki ikona+nagłówek+tekst, tuż pod Hero. */
export default function Highlights({ fields }: { fields: HighlightsFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];

  return (
    <section className="py-16 md:py-20 font-poppins">
      <Container>
        {header && <h2 className="text-center text-2xl md:text-3xl font-light">{header}</h2>}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = iconMap[item.icon] ?? AwardIcon;
            return (
              <div
                key={item.header}
                className="group rounded-md bg-white border border-[#eee] p-6 lg:p-8 text-center transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1"
              >
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] transition-colors duration-300 group-hover:bg-[#C9AB8B] group-hover:text-white">
                  <Icon />
                </span>
                <h3 className="mt-5 text-base font-medium">{item.header}</h3>
                <p className="mt-2 text-sm text-[#4a4a4a] font-light leading-relaxed">{item.content}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
