import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { getDictionary } from "@/lib/i18n/server";
import type { SocialLink } from "@/types/content";

const SOCIAL_LABELS: Record<SocialLink["platform"], string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  youtube: "YouTube",
  facebook: "Facebook",
};

export async function Footer() {
  const [settings, dict] = await Promise.all([getSiteSettings(), getDictionary()]);
  const socials = settings.socials.filter((s) => s.url);

  const footerLinks = [
    { href: "/katalog", label: dict.nav.catalog },
    { href: "/blog", label: dict.nav.blog },
    { href: "/about", label: dict.nav.about },
    { href: "/kontakt", label: dict.nav.contact },
  ];

  return (
    <footer className="no-print mt-16 border-t border-navy-100 bg-navy-900 text-navy-100 dark:border-navy-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-bold text-white">Atoyo Santexnika</p>
          <p className="mt-2 max-w-xs text-sm text-navy-300">{dict.footer.tagline}</p>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-navy-300 hover:text-aqua-300"
                >
                  {SOCIAL_LABELS[s.platform]}
                </a>
              ))}
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-2">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm hover:text-aqua-300">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="text-sm text-navy-300">
          <p>{dict.footer.phone}: {settings.phone}</p>
          <p>{dict.footer.email}: {settings.email}</p>
          <p>{dict.footer.address}: {settings.address}</p>
        </div>

        <NewsletterForm />
      </div>

      <p className="border-t border-navy-500/40 px-4 py-4 text-center text-xs text-navy-300">
        © {new Date().getFullYear()} Atoyo Santexnika. {dict.footer.rights}
      </p>
    </footer>
  );
}
