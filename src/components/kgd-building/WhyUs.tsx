import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import Card from "./Card";
import { CheckIcon, ShieldIcon, KeyIcon } from "./icons";

type StatLine = { value: string; label: string };
type Stat = { icon: string; header: string; lines: StatLine[] };
type InfoCard = { icon: string; eyebrow: string; title: string; intro: string; items: string[]; highlight?: string | null };

type WhyUsFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  subText?: EditableValue<string> | string;
  stats?: EditableValue<Stat[]> | Stat[];
  infoCards?: EditableValue<InfoCard[]> | InfoCard[];
};

const infoCardIcons: Record<string, typeof ShieldIcon> = { shield: ShieldIcon, key: KeyIcon };

function InfoCardView({ card }: { card: InfoCard }) {
  const Icon = infoCardIcons[card.icon] ?? ShieldIcon;

  return (
    <div className="flex h-full flex-col bg-white rounded-md p-8 lg:p-10 border border-[#eee] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B]">
          <Icon />
        </span>
        <span className="font-poppins text-xs font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{card.eyebrow}</span>
      </div>

      <h3 className="font-poppins mt-6 text-2xl lg:text-3xl font-light">{card.title}</h3>
      <p className="mt-4 text-[#4a4a4a] font-light">{card.intro}</p>

      <ul className="mt-6 space-y-3">
        {card.items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-[#4a4a4a]">
            <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#C9AB8B]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {card.highlight && (
        <div className="mt-6 pt-6 border-t border-[#eee]">
          <p className="font-poppins text-base font-medium italic text-[#1a1a1a]">{card.highlight}</p>
        </div>
      )}
    </div>
  );
}

/** Mirror kgd-building/WhyUs.jsx — statystyki PUM + dwa bloki "info card". */
export default function WhyUs({ fields }: { fields: WhyUsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const subText = unwrap(fields.subText);
  const stats = unwrap(fields.stats) ?? [];
  const infoCards = unwrap(fields.infoCards) ?? [];

  return (
    <section id="dlaczego-my" className="bg-[#FBFBFB] py-16 md:py-20 font-poppins">
      <Container>
        <div className="mx-auto text-center">
          {eyebrow && <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{eyebrow}</span>}
          <h2 className="mt-3 text-3xl md:text-4xl font-light">{header}</h2>
          {text && <p className="mt-4 text-[#4a4a4a] font-light max-w-2xl mx-auto">{text}</p>}
          {subText && (
            <span className="max-w-4xl mx-auto block text-lg font-light uppercase tracking-[0.1em] text-[#C9AB8B] pt-10 md:pt-16 leading-[35px]">
              {subText}
            </span>
          )}
        </div>
      </Container>

      <div className="py-10 md:py-16 grid grid-cols-2 lg:grid-cols-4 w-full gap-1 divide-x divide-[#eee]">
        {stats.map((stat, index) => (
          <Card key={stat.header} icon={stat.icon} header={stat.header} lines={stat.lines} delay={100 + index * 50} className={index === 0 ? "border-b" : ""} />
        ))}
      </div>

      <Container>
        <div className="mt-4 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {infoCards.map((card) => (
            <InfoCardView key={card.title} card={card} />
          ))}
        </div>
      </Container>
    </section>
  );
}
