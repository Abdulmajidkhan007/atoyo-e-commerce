import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import { AppDownloadCard } from "./AppDownloadCard";
import { getSiteSettings } from "@/lib/firebase/admin-content";
import { getDeliverySettings } from "@/lib/orders/pricing";
import { freeDeliveryShort } from "@/lib/delivery/text";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { localeHref } from "@/lib/i18n/href";
import type { SocialLink } from "@/types/content";

const SOCIAL_LABELS: Record<SocialLink["platform"], string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  youtube: "YouTube",
  facebook: "Facebook",
};

export async function Footer() {
  const [settings, dict, delivery, locale] = await Promise.all([
    getSiteSettings(),
    getDictionary(),
    getDeliverySettings(),
    getLocale(),
  ]);
  const socials = settings.socials.filter((s) => s.url);

  const footerLinks = [
    { href: "/katalog", label: dict.nav.catalog },
    { href: "/blog", label: dict.nav.blog },
    { href: "/about", label: dict.nav.about },
    { href: "/kontakt", label: dict.nav.contact },
    // Play Store va Google talab qiladigan ochiq havola.
    { href: "/maxfiylik", label: "Maxfiylik siyosati" },
  ];

  return (
    <footer className="no-print mt-16 border-t border-navy-100 bg-navy-900 text-navy-100 dark:border-navy-500">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-bold text-white">Atoyo Santexnika</p>
          <p className="mt-2 max-w-xs text-sm text-navy-200">{dict.footer.tagline}</p>
          {/* Yetkazib berish va'dasi HAR sahifada ko'rinadi. */}
          <p className="mt-3 max-w-xs text-sm font-medium text-aqua-300">
            {/* Emoji - BEZAK. Usiz ham matn to'liq tushunarli, ekran
                o'quvchi esa "yuk mashinasi" deb o'qib vaqt yo'qotmasin. */}
            <span aria-hidden="true">🚚</span> {freeDeliveryShort(delivery)}
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {socials.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-navy-200 hover:text-aqua-300"
                >
                  {SOCIAL_LABELS[s.platform]}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Sahifada uchta <nav> bor (yuqori, pastki, footer) — ekran
            o'quvchi ularni ro'yxatlab beradi va nomsiz bo'lsa uchalasi
            ham "navigatsiya" bo'lib chiqadi. */}
        <nav aria-label="Qo'shimcha sahifalar" className="flex flex-col gap-2">
          {footerLinks.map((link) => (
            <Link key={link.href} href={localeHref(link.href, locale)} className="text-sm hover:text-aqua-300">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="text-sm text-navy-200">
          <p>{dict.footer.phone}: {settings.phone}</p>
          <p>{dict.footer.email}: {settings.email}</p>
          <p>{dict.footer.address}: {settings.address}</p>
        </div>

        <div className="flex flex-col gap-6 md:max-w-xs">
          <NewsletterForm />
          <AppDownloadCard />
        </div>
      </div>

      <p className="border-t border-navy-500/40 px-4 py-4 text-center text-xs text-navy-200">
        © {new Date().getFullYear()} Atoyo Santexnika. {dict.footer.rights}
      </p>
    </footer>
  );
}
