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
    <nav className="glass-nav no-print fixed inset-x-3 bottom-3 z-30 flex md:hidden">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            // Oltita bo'lim tor telefon ekraniga ham sig'ishi kerak:
            // yon bo'shliqlar minimal, matn kichik va bir qatorda.
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-2 transition ${
              isActive
                ? "font-semibold text-aqua-700 dark:text-aqua-300"
                : "text-[color:var(--glass-fg-muted)]"
            }`}
            // Faol bo'limda yumshoq urg'u - iOS'dagi kabi to'liq rangli
            // fon emas, yengil "highlight".
            style={isActive ? { backgroundColor: "var(--glass-field)" } : undefined}
          >
            <Icon sx={{ fontSize: 20 }} />
            <span className="w-full truncate text-center text-[10px] leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
