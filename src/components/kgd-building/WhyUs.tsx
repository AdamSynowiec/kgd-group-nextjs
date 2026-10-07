import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import Card from "./Card";
import SectionHeading from "./SectionHeading";
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

/** Dwa bloki informacyjne: pierwszy ciemny, drugi jasny (ciepły beż) — ten sam kontrast kafelków co FeatureGrid w /wykonczenie-pod-klucz. */
function InfoCardView({ card, dark }: { card: InfoCard; dark: boolean }) {
  const Icon = infoCardIcons[card.icon] ?? ShieldIcon;

  return (
    <div
      className={`flex h-full flex-col p-8 lg:p-10 transition-all duration-500 hover:-translate-y-2 ${
        dark ? "bg-[#141414] text-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.35)]" : "bg-[#FBF8F4] text-[#141414] hover:shadow-[0_30px_60px_rgba(201,171,139,0.3)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 place-items-center rounded-full ${dark ? "bg-white/10" : "bg-[#C9AB8B]/15"} text-[#C9AB8B]`}>
          <Icon />
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#C9AB8B]">{card.eyebrow}</span>
      </div>

      <h3 className="mt-7 font-ranade-variable font-light text-[26px] lg:text-[32px] leading-tight">{card.title}</h3>
      <p className={`mt-4 font-light leading-relaxed ${dark ? "text-white/65" : "text-black/60"}`}>{card.intro}</p>

      <ul className="mt-6 space-y-3">
        {card.items.map((item) => (
          <li key={item} className={`flex items-start gap-3 text-sm sm:text-base font-light ${dark ? "text-white/80" : "text-black/70"}`}>
            <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#C9AB8B]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {card.highlight && (
        <div className={`mt-6 pt-6 border-t ${dark ? "border-white/10" : "border-black/10"}`}>
          <p className="font-ranade-variable text-lg font-light italic text-[#C9AB8B]">{card.highlight}</p>
        </div>
      )}
    </div>
  );
}

/** Statystyki PUM (płaska dzielona siatka) + dwa bloki "info card". */
export default function WhyUs({ fields }: { fields: WhyUsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const subText = unwrap(fields.subText);
  const stats = unwrap(fields.stats) ?? [];
  const infoCards = unwrap(fields.infoCards) ?? [];

  return (
    <section id="dlaczego-my" className="bg-[#FBFBFB] py-20 md:py-28 font-poppins">
      <Container>
        <SectionHeading eyebrow={eyebrow} header={header} text={text}>
          {subText && <span className="mt-6 block text-[13px] font-light uppercase tracking-[0.18em] text-[#C9AB8B] leading-relaxed">{subText}</span>}
        </SectionHeading>

        <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/[0.08] border border-black/[0.08] bg-white">
          {stats.map((stat, index) => (
            <Card key={stat.header} icon={stat.icon} header={stat.header} lines={stat.lines} delay={index * 80} />
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {infoCards.map((card, index) => (
            <InfoCardView key={card.title} card={card} dark={index % 2 === 0} />
          ))}
        </div>
      </Container>
    </section>
  );
}
