"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useI18n } from "@/lib/i18n/LocaleContext";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { dict } = useI18n();

  // Savat yuqori panelda (Header) turadi - pastki menyuda uning o'rniga
  // Kontakt bo'limi, aks holda kontaktga faqat footer orqali o'tilardi.
  const tabs = [
    { href: "/", label: dict.nav.homeShort, icon: HomeOutlinedIcon },
    { href: "/katalog", label: dict.nav.catalog, icon: CategoryOutlinedIcon },
    { href: "/blog", label: dict.nav.blog, icon: ArticleOutlinedIcon },
    { href: "/about", label: dict.nav.aboutShort, icon: InfoOutlinedIcon },
    { href: "/kontakt", label: dict.nav.contact, icon: SupportAgentOutlinedIcon },
    { href: "/profil", label: dict.nav.profile, icon: PersonOutlineIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-navy-100 bg-white/95 backdrop-blur md:hidden dark:border-navy-500 dark:bg-navy-900/95">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            // Oltita bo'lim tor telefon ekraniga ham sig'ishi kerak:
            // yon bo'shliqlar minimal, matn kichik va bir qatorda.
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 pb-2 pt-1.5 ${
              isActive ? "text-aqua-600 dark:text-aqua-300" : "text-navy-300"
            }`}
          >
            <Icon sx={{ fontSize: 20 }} />
            <span className="w-full truncate text-center text-[10px] leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
