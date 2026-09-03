import Link from "next/link";
import { unwrap, type EditableValue } from "@/lib/editable";

type SocialLink = { icon: "youtube" | "instagram" | "facebook"; href: string; label: string };
type InvestmentLink = { text: string; url: string };
type ColumnHeaders = { developer: string; investments: string; kgdBuilding: string; cooperation: string };
type KgdBuildingLinks = { private: string; developer: string };
type CooperationLinks = { investor: string; land: string };

type FooterFields = {
  description?: EditableValue<string> | string;
  building_description?: EditableValue<string> | string;
  company?: EditableValue<string> | string;
  address?: EditableValue<string> | string;
  phone?: EditableValue<string> | string;
  email?: EditableValue<string> | string;
  investments?: EditableValue<InvestmentLink[]> | InvestmentLink[];
  socials?: EditableValue<SocialLink[]> | SocialLink[];
  columnHeaders?: EditableValue<ColumnHeaders> | ColumnHeaders;
  kgdBuildingLinks?: EditableValue<KgdBuildingLinks> | KgdBuildingLinks;
  cooperationLinks?: EditableValue<CooperationLinks> | CooperationLinks;
  privacyLinkLabel?: EditableValue<string> | string;
  copyrightText?: EditableValue<string> | string;
};

const socialIcons: Record<SocialLink["icon"], React.ReactNode> = {
  youtube: (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
      <path d="M30.722 20.579C30.137 21.894 28.628 23.085 27.211 23.348C27.066 23.375 23.603 24 16.01 24H15.99C8.398 24 4.932 23.375 4.788 23.349C3.371 23.085 1.861 21.894 1.275 20.578C1.223 20.461 0.001 17.647 0.001 12C0.001 6.353 1.223 3.538 1.275 3.421C1.861 2.105 3.371 0.915 4.788 0.652C4.932 0.625 8.398 0 15.99 0C23.603 0 27.066 0.625 27.21 0.651C28.628 0.915 30.137 2.105 30.723 3.42C30.775 3.538 32 6.353 32 12C32 17.647 30.775 20.461 30.722 20.579ZM14.009 8.794V15.189L19.137 11.963L14.009 8.794Z" />
    </svg>
  ),
  instagram: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M7 2H17C19.7614 2 22 4.23858 22 7V17C22 19.7614 19.7614 22 17 22H7C4.23858 22 2 19.7614 2 17V7C2 4.23858 4.23858 2 7 2Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22V12.9H16.5L17 9.4H13.5V7.2C13.5 6.2 13.8 5.5 15.2 5.5H17.1V2.3C16.8 2.3 15.7 2.2 14.4 2.2C11.7 2.2 9.9 3.8 9.9 6.8V9.4H7V12.9H9.9V22H13.5Z" />
    </svg>
  ),
};

/** Naprawdę globalna sekcja (identyczna w każdej inwestycji) — patrz AGENTS.md, wyjątek dla Footer/Contact/Deweloper. */
export default function Footer({ fields }: { fields: FooterFields }) {
  const description = unwrap(fields.description);
  const buildingDescription = unwrap(fields.building_description);
  const company = unwrap(fields.company);
  const address = unwrap(fields.address);
  const phone = unwrap(fields.phone);
  const email = unwrap(fields.email);
  const investments = unwrap(fields.investments) ?? [];
  const socials = unwrap(fields.socials) ?? [];
  const columnHeaders = unwrap(fields.columnHeaders);
  const kgdBuildingLinks = unwrap(fields.kgdBuildingLinks);
  const cooperationLinks = unwrap(fields.cooperationLinks);
  const privacyLinkLabel = unwrap(fields.privacyLinkLabel);
  const copyrightText = unwrap(fields.copyrightText);

  return (
    <footer className="bg-[#1D1D1D] text-gray-400 font-poppins">
      <div className="container mx-auto px-6 pt-[100px] pb-8">
        <div className="grid grid-cols-12 gap-y-16 md:gap-16">
          {/* LEFT COLUMN */}
          <div className="col-span-12 md:col-span-3 space-y-10 pr-10">
            <Link href="/">
              <img loading="lazy" decoding="async" src="/investments/shared/kgd-group-logo.svg" alt="KGD Group Logo" className="h-9 w-auto mb-4" />
            </Link>

            {description && <p className="text-sm leading-relaxed text-gray-500">{description}</p>}

            <Link href="/kgd-building">
              <img loading="lazy" decoding="async" src="/investments/shared/kgd-building-logo.svg" alt="KGD Building Logo" className="h-9 w-auto mb-4" />
            </Link>

            {buildingDescription && <p className="text-sm leading-relaxed text-gray-500">{buildingDescription}</p>}

            <ul className="flex items-center gap-3 pt-2">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="group/social relative w-[48px] h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl flex items-center justify-center text-white/70 overflow-visible transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:text-white hover:shadow-[0_10px_40px_rgba(255,255,255,0.08)]"
                  >
                    <div className="absolute bottom-[calc(100%+14px)] left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/90 whitespace-nowrap opacity-0 translate-y-2 pointer-events-none transition-all duration-300 group-hover/social:opacity-100 group-hover/social:translate-y-0">
                      {social.label}
                    </div>
                    <div className="relative z-10 transition-transform duration-500 group-hover/social:scale-110">{socialIcons[social.icon]}</div>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT */}
          <div className="col-span-12 md:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-14">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">{columnHeaders?.developer}</p>
                <div className="mt-6 flex flex-col space-y-2 text-sm text-gray-400">
                  <span>{company}</span>
                  <span className="pt-2">{address}</span>
                  {phone && (
                    <a href={`tel:${phone}`} className="pt-2 text-gray-300 hover:text-white transition-colors hover:underline">
                      {phone}
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="text-gray-300 hover:text-white transition-colors hover:underline">
                      {email}
                    </a>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">{columnHeaders?.investments}</p>
                <div className="mt-6 flex flex-col space-y-3 text-sm">
                  {investments.map((item) => (
                    <Link key={item.url} href={item.url} className="text-gray-300 hover:text-white transition-colors hover:underline">
                      {item.text}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">{columnHeaders?.kgdBuilding}</p>
                <div className="mt-6 flex flex-col space-y-3 text-sm">
                  <Link href="/kgd-building/indywidualna" className="text-gray-300 hover:text-white transition-colors hover:underline">
                    {kgdBuildingLinks?.private}
                  </Link>
                  <Link href="/kgd-building/deweloper" className="text-gray-300 hover:text-white transition-colors hover:underline">
                    {kgdBuildingLinks?.developer}
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">{columnHeaders?.cooperation}</p>
                <div className="mt-6 flex flex-col space-y-3 text-sm">
                  <Link href="/#dla_inwestora" className="text-gray-300 hover:text-white transition-colors hover:underline">
                    {cooperationLinks?.investor}
                  </Link>
                  <Link href="/#zakup_gruntów" className="text-gray-300 hover:text-white transition-colors hover:underline">
                    {cooperationLinks?.land}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div className="border-t border-[#333333] mt-16 pt-8">
          <div className="flex flex-col md:flex-row md:justify-between items-center text-sm text-gray-500">
            <Link href="/polityka-prywatnosci" className="text-gray-300 hover:text-white transition-colors hover:underline">
              {privacyLinkLabel}
            </Link>
            <p className="mt-4 md:mt-0">
              © {new Date().getFullYear()} {copyrightText}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
