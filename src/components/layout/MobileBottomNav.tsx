"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useAppSelector } from "@/redux/hooks";
import { useTranslation } from "@/i18n/I18nProvider";

export function MobileBottomNav() {
  const pathname = usePathname();
  const t = useTranslation();
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));

  const TABS = [
    { href: "/", label: t.nav.homeShort, icon: HomeOutlinedIcon },
    { href: "/katalog", label: t.nav.catalog, icon: CategoryOutlinedIcon },
    { href: "/blog", label: t.nav.blog, icon: ArticleOutlinedIcon },
    { href: "/about", label: t.nav.aboutShort, icon: InfoOutlinedIcon },
    { href: "/savat", label: t.nav.cart, icon: ShoppingCartOutlinedIcon },
    { href: "/profil", label: t.nav.profile, icon: PersonOutlineIcon },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-navy-100 bg-white/95 backdrop-blur md:hidden dark:border-navy-500 dark:bg-navy-900/95">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
              isActive ? "text-aqua-600 dark:text-aqua-300" : "text-navy-300"
            }`}
          >
            {href === "/savat" ? (
              <Badge badgeContent={cartCount} color="primary" max={99}>
                <Icon fontSize="small" />
              </Badge>
            ) : (
              <Icon fontSize="small" />
            )}
            <span className="w-full truncate text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
