import { getSite } from "@/lib/content";

export default function SiteFooter() {
  const site = getSite();

  return (
    <footer className="mt-auto border-t border-black/[.06] py-8 dark:border-white/[.08]">
      <div className="mx-auto max-w-5xl px-6 text-sm text-zinc-500 dark:text-zinc-400">
        <p>{site.brand.tagline}</p>
        <p className="mt-2">
          © {new Date().getFullYear()} {site.brand.name}
        </p>
      </div>
    </footer>
  );
}
