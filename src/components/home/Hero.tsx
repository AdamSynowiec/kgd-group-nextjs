import EditorialHero, { type HeroSocial } from "@/components/shared/EditorialHero";

const socials: HeroSocial[] = [
  {
    href: "https://www.youtube.com/@KGD-Group",
    label: "YouTube",
    icon: (
      <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
        <path d="M30.722 20.579C30.137 21.894 28.628 23.085 27.211 23.348C27.066 23.375 23.603 24 16.01 24H15.99C8.398 24 4.932 23.375 4.788 23.349C3.371 23.085 1.861 21.894 1.275 20.578C1.223 20.461 0.001 17.647 0.001 12C0.001 6.353 1.223 3.538 1.275 3.421C1.861 2.105 3.371 0.915 4.788 0.652C4.932 0.625 8.398 0 15.99 0C23.603 0 27.066 0.625 27.21 0.651C28.628 0.915 30.137 2.105 30.723 3.42C30.775 3.538 32 6.353 32 12C32 17.647 30.775 20.461 30.722 20.579ZM14.009 8.794V15.189L19.137 11.963L14.009 8.794Z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/krakowska_grupa_deweloperska/",
    label: "Instagram",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2Z" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "https://www.facebook.com/krakowskagrupadeweloperska/?locale=pl_PL",
    label: "Facebook",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 22V12.9H16.5L17 9.4H13.5V7.2C13.5 6.2 13.8 5.5 15.2 5.5H17.1V2.3C16.8 2.3 15.7 2.2 14.4 2.2C11.7 2.2 9.9 3.8 9.9 6.8V9.4H7V12.9H9.9V22H13.5Z" />
      </svg>
    ),
  },
];

export default function Hero({
  bg,
  videoBg,
  header,
  subHeader,
  scrollTo,
}: {
  bg: string;
  videoBg: string;
  header: string;
  subHeader: string;
  scrollTo: string;
}) {
  return <EditorialHero heading={header} lead={subHeader} video={videoBg} poster={bg} scrollTo={scrollTo} scrollLabel="O nas" socials={socials} />;
}
