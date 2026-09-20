"use client";

import { Link } from "@/lib/i18n/LocaleLink";
import { usePathname } from "next/navigation";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Badge } from "@mui/material";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { stripLocalePrefix } from "@/lib/i18n/href";

export function MobileBottomNav() {
  const pathname = stripLocalePrefix(usePathname()).path;
  const { dict } = useI18n();
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const favoritesCount = useAppSelector((s) => s.favorites.items.length);

  /**
   * FAQAT XARID YO'LI.
   *
   * Ilgari bu yerda 6 ta band bor edi (Blog, Haqida, Kontakt, Profil
   * ham) va SAVAT umuman yo'q edi — do'kon uchun tartib xatosi:
   * mijoz savatga faqat yuqoridagi kichik ikonka orqali tusha olardi.
   * Endi pastda xariddagi to'rtta qadam, qolgan sahifalar esa
   * yuqoridagi burger menyusida (`MobileMenu`).
   */
  const tabs = [
    { href: "/", label: dict.nav.homeShort, icon: HomeOutlinedIcon, count: 0 },
    { href: "/katalog", label: dict.nav.catalog, icon: CategoryOutlinedIcon, count: 0 },
    { href: "/sevimlilar", label: dict.favorites.title, icon: FavoriteBorderIcon, count: favoritesCount },
    { href: "/savat", label: dict.nav.cart, icon: ShoppingCartOutlinedIcon, count: cartCount },
  ];

  return (
    <nav aria-label="Xarid yo'li" className="glass-nav no-print fixed inset-x-3 bottom-3 z-30 flex md:hidden">
      {tabs.map(({ href, label, icon: Icon, count }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            // Ekran o'quvchi "joriy sahifa" deb aytib bersin - ko'z bilan
            // ko'riladigan rangli urg'uning matnli muqobili.
            aria-current={isActive ? "page" : undefined}
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
            {/* Savat/sevimlilardagi son shu yerda ko'rinadi - ilgari
                u faqat yuqoridagi ikonkada edi va telefonda bilinmasdi. */}
            {count > 0 ? (
              <Badge badgeContent={count} color="error" max={99} overlap="circular">
                <Icon sx={{ fontSize: 20 }} />
              </Badge>
            ) : (
              <Icon sx={{ fontSize: 20 }} />
            )}
            <span className="w-full truncate text-center text-[10px] leading-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
