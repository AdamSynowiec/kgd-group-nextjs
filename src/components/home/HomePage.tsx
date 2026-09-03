import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";
import NavBar from "./NavBar";
import Hero from "./Hero";
import FeatureImage from "./FeatureImage";
import FeatureCard, { type InvestmentCardData } from "./FeatureCard";
import Container from "./Container";
import Section from "./Section";
import H2 from "./H2";
import P from "./P";
import Card from "./Card";
import Partners, { type PartnerCategory } from "./Partners";
import type { MenuItem } from "./NavMenuItem";

type StatCard = { icon: string; header: string; lines: { value: string; label: string }[] };
type SimpleCard = { icon: string; header: string; content?: string };

type HomePageFields = {
  logo: EditableValue<string> | string;
  navMenu?: EditableValue<MenuItem[]> | MenuItem[];
  navPhone?: EditableValue<string> | string;

  heroBg: EditableValue<string> | string;
  heroVideo: EditableValue<string> | string;
  heroHeader: EditableValue<string> | string;
  heroSubHeader?: EditableValue<string> | string;

  kimJestesmyHeader?: EditableValue<string> | string;
  companyName?: EditableValue<string> | string;
  kimJestesmyParagraph1?: EditableValue<string> | string;
  kimJestesmyParagraph2?: EditableValue<string> | string;

  featureImage1?: { src: string; title: string; subtitle: string };

  statCards?: EditableValue<StatCard[]> | StatCard[];

  aktualneHeader?: EditableValue<string> | string;
  aktualneText?: EditableValue<string> | string;
  aktualneInwestycje?: EditableValue<InvestmentCardData[]> | InvestmentCardData[];

  zakonczoneHeader?: EditableValue<string> | string;
  zakonczoneText?: EditableValue<string> | string;
  zakonczoneInwestycje?: EditableValue<InvestmentCardData[]> | InvestmentCardData[];

  dlaInwestoraHeader?: EditableValue<string> | string;
  dlaInwestoraText?: EditableValue<string> | string;
  dlaInwestoraCards?: EditableValue<SimpleCard[]> | SimpleCard[];
  dlaInwestoraCtaLabel?: EditableValue<string> | string;

  zakupGruntowHeader?: EditableValue<string> | string;
  zakupGruntowText?: EditableValue<string> | string;
  zakupGruntowCards?: EditableValue<SimpleCard[]> | SimpleCard[];
  zakupGruntowCtaLabel?: EditableValue<string> | string;
  zakupGruntowPhoneDigits?: EditableValue<string> | string;
  zakupGruntowPhoneLabel?: EditableValue<string> | string;

  featureImage2?: { src: string; title: string; subtitle: string };

  kgdBuildingPrivateHeader?: EditableValue<string> | string;
  kgdBuildingPrivateText?: EditableValue<string> | string;
  kgdBuildingPrivateCtaLabel?: EditableValue<string> | string;

  featureImage3?: { src: string; title: string; subtitle: string };

  kgdBuildingDeveloperHeader?: EditableValue<string> | string;
  kgdBuildingDeveloperText?: EditableValue<string> | string;
  kgdBuildingDeveloperCtaLabel?: EditableValue<string> | string;

  featureImage4?: { src: string; title: string; subtitle: string };

  partnersEyebrow?: EditableValue<string> | string;
  partnersHeader?: EditableValue<string> | string;
  partnersText?: EditableValue<string> | string;
  partnersCategories?: EditableValue<PartnerCategory[]> | PartnerCategory[];
};

const ctaClass =
  "group inline-flex items-center justify-center px-6 py-3 rounded-full font-poppins font-light tracking-wide bg-[#C9AB8B] text-white border border-[#C9AB8B] transition-all duration-300 hover:bg-transparent hover:text-[#C9AB8B] hover:shadow-[0_10px_30px_rgba(201,171,139,0.25)] text-center";

export default function HomePage({ fields }: { fields: HomePageFields }) {
  const logo = unwrap(fields.logo) ?? "";
  const navMenu = unwrap(fields.navMenu) ?? [];
  const navPhone = unwrap(fields.navPhone) ?? "";

  const heroBg = unwrap(fields.heroBg) ?? "";
  const heroVideo = unwrap(fields.heroVideo) ?? "";
  const heroHeader = unwrap(fields.heroHeader) ?? "";
  const heroSubHeader = unwrap(fields.heroSubHeader) ?? "";

  const kimJestesmyHeader = unwrap(fields.kimJestesmyHeader);
  const companyName = unwrap(fields.companyName);
  const kimJestesmyParagraph1 = unwrap(fields.kimJestesmyParagraph1);
  const kimJestesmyParagraph2 = unwrap(fields.kimJestesmyParagraph2);

  const statCards = unwrap(fields.statCards) ?? [];

  const aktualneHeader = unwrap(fields.aktualneHeader);
  const aktualneText = unwrap(fields.aktualneText);
  const aktualneInwestycje = unwrap(fields.aktualneInwestycje) ?? [];

  const zakonczoneHeader = unwrap(fields.zakonczoneHeader);
  const zakonczoneText = unwrap(fields.zakonczoneText);
  const zakonczoneInwestycje = unwrap(fields.zakonczoneInwestycje) ?? [];

  const dlaInwestoraHeader = unwrap(fields.dlaInwestoraHeader);
  const dlaInwestoraText = unwrap(fields.dlaInwestoraText);
  const dlaInwestoraCards = unwrap(fields.dlaInwestoraCards) ?? [];
  const dlaInwestoraCtaLabel = unwrap(fields.dlaInwestoraCtaLabel);

  const zakupGruntowHeader = unwrap(fields.zakupGruntowHeader);
  const zakupGruntowText = unwrap(fields.zakupGruntowText);
  const zakupGruntowCards = unwrap(fields.zakupGruntowCards) ?? [];
  const zakupGruntowCtaLabel = unwrap(fields.zakupGruntowCtaLabel);
  const zakupGruntowPhoneDigits = unwrap(fields.zakupGruntowPhoneDigits) ?? "";
  const zakupGruntowPhoneLabel = unwrap(fields.zakupGruntowPhoneLabel) ?? "";

  const kgdBuildingPrivateHeader = unwrap(fields.kgdBuildingPrivateHeader);
  const kgdBuildingPrivateText = unwrap(fields.kgdBuildingPrivateText);
  const kgdBuildingPrivateCtaLabel = unwrap(fields.kgdBuildingPrivateCtaLabel);

  const kgdBuildingDeveloperHeader = unwrap(fields.kgdBuildingDeveloperHeader);
  const kgdBuildingDeveloperText = unwrap(fields.kgdBuildingDeveloperText);
  const kgdBuildingDeveloperCtaLabel = unwrap(fields.kgdBuildingDeveloperCtaLabel);

  const partnersEyebrow = unwrap(fields.partnersEyebrow) ?? "";
  const partnersHeader = unwrap(fields.partnersHeader) ?? "";
  const partnersText = unwrap(fields.partnersText) ?? "";
  const partnersCategories = unwrap(fields.partnersCategories) ?? [];

  return (
    <Section className="overflow-x-hidden">
      <NavBar logo={logo} menu={navMenu} phone={navPhone} />

      <Hero bg={heroBg} videoBg={heroVideo} header={heroHeader} subHeader={heroSubHeader} scrollTo="#kim_jestesmy" />

      <Container>
        <div id="kim_jestesmy" />
        <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
          <H2 reveal delay={100} className="text-center" separator>
            {kimJestesmyHeader}
          </H2>
          <P reveal delay={200}>
            <span className="font-medium">{companyName}</span> {kimJestesmyParagraph1}
          </P>
          <br />
          <P className="font-medium">{kimJestesmyParagraph2}</P>
        </Section>
      </Container>

      {fields.featureImage1 && <FeatureImage {...fields.featureImage1} />}

      <Section className="py-[32.0px] md:py-[40px] md:py-[80px] grid grid-cols-2 lg:grid-cols-4 w-full gap-[4px] divide-x divide-[#eee]">
        {statCards.map((card, i) => (
          <Card key={card.header} icon={card.icon} header={card.header} lines={card.lines} delay={100 + i * 50} className={i === 0 ? "border-b" : ""} />
        ))}
      </Section>

      <Container>
        <div id="inwestycje" />
        <div id="inwestycje_aktualne" />
        <H2 reveal delay={100} className="text-center" separator>
          {aktualneHeader}
        </H2>
        {aktualneText && (
          <P reveal delay={200} className="mb-[32.0px] md:mb-[40px]">
            {aktualneText}
          </P>
        )}

        <Section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-[32px] items-stretch">
          {aktualneInwestycje.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </Section>
      </Container>

      <Section>
        <Container>
          <div id="inwestycje_zakonczone" />
          <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
            <H2 reveal delay={100} className="text-center" separator>
              {zakonczoneHeader}
            </H2>
            {zakonczoneText && (
              <P reveal delay={200} className="mb-[32.0px] md:mb-[40px]">
                {zakonczoneText}
              </P>
            )}

            <Section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px] items-stretch">
              {zakonczoneInwestycje.map((item) => (
                <FeatureCard key={item.title} {...item} link={undefined} />
              ))}
            </Section>
          </Section>
        </Container>
      </Section>

      <Section className="bg-[#FBFBFB]">
        <Container>
          <div id="dla_inwestora" />
          <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
            <H2 reveal delay={100} className="text-center" separator>
              {dlaInwestoraHeader}
            </H2>
            {dlaInwestoraText && (
              <P reveal delay={200} className="mb-[32.0px] md:mb-[40px]">
                {dlaInwestoraText}
              </P>
            )}

            <Section className="grid grid-cols-2 lg:grid-cols-4 w-full gap-[4px]">
              {dlaInwestoraCards.map((card) => (
                <Card key={card.header} icon={card.icon} header={card.header} delay={100} />
              ))}
            </Section>

            {dlaInwestoraCtaLabel && (
              <Section className="flex justify-center items-center mt-[40px]">
                <Link href="/#kontakt" className={ctaClass}>
                  {dlaInwestoraCtaLabel}
                </Link>
              </Section>
            )}
          </Section>
        </Container>
      </Section>

      <div id="zakup_gruntów" />
      <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
        <Container>
          <H2 reveal delay={100} className="text-center" separator>
            {zakupGruntowHeader}
          </H2>
          {zakupGruntowText && (
            <P className="mb-[32.0px] md:mb-[40px]" reveal delay={200}>
              {zakupGruntowText}
            </P>
          )}
        </Container>

        <Section className="py-[32.0px] md:py-[40px] md:py-[80px] grid grid-cols-2 lg:grid-cols-4 w-full gap-[4px] md:divide-x divide-[#eee]">
          {zakupGruntowCards.map((card) => (
            <Card key={card.header} icon={card.icon} header={card.header} content={card.content} delay={100} />
          ))}
        </Section>

        <Section className="flex items-center justify-center flex-col md:flex-row gap-4">
          {zakupGruntowCtaLabel && (
            <Link href="/#kontakt" className={ctaClass}>
              {zakupGruntowCtaLabel}
            </Link>
          )}
          <span className="font-poppins text-[#717171]">lub</span>
          {zakupGruntowPhoneDigits && (
            <a href={`tel:${zakupGruntowPhoneDigits}`} className={ctaClass}>
              {zakupGruntowPhoneLabel}
            </a>
          )}
        </Section>
      </Section>

      {fields.featureImage2 && <FeatureImage {...fields.featureImage2} />}

      <Section className="bg-[#FBFBFB]">
        <Container>
          <div id="kgd_building" />
          <div id="osoba_prywatna" />
          <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
            <H2 reveal delay={100} className="text-center" separator>
              {kgdBuildingPrivateHeader}
            </H2>
            {kgdBuildingPrivateText && (
              <P reveal delay={200} className="mb-[32.0px] md:mb-[40px]">
                {kgdBuildingPrivateText}
              </P>
            )}
            {kgdBuildingPrivateCtaLabel && (
              <Section className="flex items-center justify-center">
                <Link href="/kgd-building/indywidualna" className={ctaClass}>
                  {kgdBuildingPrivateCtaLabel}
                </Link>
              </Section>
            )}
          </Section>
        </Container>
      </Section>

      {fields.featureImage3 && <FeatureImage {...fields.featureImage3} />}

      <Section className="bg-[#FBFBFB]">
        <Container>
          <div id="dla_dewelopera" />
          <Section className="py-[32.0px] md:py-[40px] md:py-[80px]">
            <H2 reveal delay={100} className="text-center" separator>
              {kgdBuildingDeveloperHeader}
            </H2>
            {kgdBuildingDeveloperText && (
              <P reveal delay={200} className="mb-[32.0px] md:mb-[40px]">
                {kgdBuildingDeveloperText}
              </P>
            )}
            {kgdBuildingDeveloperCtaLabel && (
              <Section className="flex items-center justify-center">
                <Link href="/kgd-building/deweloper" className={ctaClass}>
                  {kgdBuildingDeveloperCtaLabel}
                </Link>
              </Section>
            )}
          </Section>
        </Container>
      </Section>

      {fields.featureImage4 && <FeatureImage {...fields.featureImage4} />}

      <Partners eyebrow={partnersEyebrow} header={partnersHeader} text={partnersText} categories={partnersCategories} />
    </Section>
  );
}
