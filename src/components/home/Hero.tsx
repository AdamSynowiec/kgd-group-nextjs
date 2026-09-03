import H1 from "./H1";
import P from "./P";

const socials = [
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
  return (
    <div className="relative lg:min-h-svh bg-slate-100 overflow-hidden">
      <video className="absolute inset-0 w-full h-full object-cover pointer-events-none" autoPlay muted loop playsInline preload="auto" poster={bg}>
        <source src={videoBg} type="video/mp4" />
      </video>

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.2),rgba(0,0,0,0.75))] mix-blend-multiply" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_60%)]" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl animate-pulse pointer-events-none" />

      <div className="container max-w-[1596px] mx-auto px-6 min-h-svh flex flex-col justify-center text-white relative">
        <div className="mx-auto md:max-w-[90%]">
          <H1 className="md:mb-[40px] max-w-[1100px] opacity-0 animate-[fadeUp_1s_ease_forwards]">{header}</H1>
          <P className="text-white/85 !text-[18px]/[32px] md:!text-[26px]/[44px] md:max-w-[50vw] opacity-0 animate-[fadeUp_1.2s_ease_forwards]">{subHeader}</P>
        </div>

        <div className="absolute bottom-[50px] left-6 right-6 flex items-end justify-between">
          <a href={scrollTo} className="group/scroll flex flex-col items-center gap-3 text-white/70 hover:text-white transition-colors">
            <span className="text-[11px] uppercase tracking-[0.18em] opacity-70">O nas</span>
            <div className="w-[42px] h-[42px] rounded-full border border-white/15 bg-white/5 backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover/scroll:bg-white/10 group-hover/scroll:translate-y-1">
              <svg width="18" height="18" viewBox="0 0 51 27" fill="none">
                <path d="M49.7082 1.125L25.4998 25.3333L1.2915 1.125" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </a>

          <ul className="flex items-center gap-3">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="group/social relative w-[52px] h-[52px] rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl flex items-center justify-center text-white/80 overflow-visible transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:text-white hover:shadow-[0_10px_40px_rgba(255,255,255,0.12)]"
                >
                  <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/90 whitespace-nowrap opacity-0 translate-y-2 pointer-events-none transition-all duration-300 group-hover/social:opacity-100 group-hover/social:translate-y-0">
                    {social.label}
                  </div>
                  <div className="absolute inset-0 opacity-0 group-hover/social:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/10 via-transparent to-white/5 rounded-2xl" />
                  <div className="relative z-10 transition-transform duration-500 group-hover/social:scale-110">{social.icon}</div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[160px] bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
