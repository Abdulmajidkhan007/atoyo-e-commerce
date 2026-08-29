"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge, IconButton, Avatar, Button } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UiModeSwitch } from "./UiModeSwitch";
import { SearchBar } from "@/components/product/SearchBar";

export function Header({ show3dMode = false }: { show3dMode?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { dict } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const favoritesCount = useAppSelector((s) => s.favorites.items.length);
  const userProfile = useAppSelector((s) => s.user.profile);
  const headerRef = useRef<HTMLElement>(null);

  // Header qatorlari ekranga (va 3D almashtirgichga) qarab balandligi
  // o'zgaradi - katalogdagi yopishib turuvchi filtr paneli xuddi shu
  // balandlikdan boshlab yopishishi kerak, shuning uchun `--header-height`
  // CSS o'zgaruvchisiga yoziladi (qattiq son ishlatib bo'lmaydi).
  // ResizeObserver o'zi HAR QANDAY balandlik o'zgarishini ushlaydi -
  // qayta obuna bo'lish uchun render sababiga bog'liq emas.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height !== undefined) {
        document.documentElement.style.setProperty("--header-height", `${height}px`);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { href: "/", label: dict.nav.home },
    { href: "/katalog", label: dict.nav.catalog },
    { href: "/blog", label: dict.nav.blog },
    { href: "/about", label: dict.nav.about },
    { href: "/kontakt", label: dict.nav.contact },
  ];

  const handleSearchSubmit = () => {
    const query = searchTerm.trim();
    router.push(query ? `/katalog?q=${encodeURIComponent(query)}` : "/katalog");
  };

  return (
    <header ref={headerRef} className="glass-strong no-print sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        {/* Brend bloki qisqara oladi (min-w-0), tugmalar esa qisqarmaydi -
            shunda tor telefonda nom kesiladi, tugmalar chiqib ketmaydi. */}
        <Link href="/" className="flex min-w-0 items-center gap-2 text-navy-900 dark:text-white">
          <Image
            src="/logo.jpg"
            alt="Atoyo Santexnika"
            width={32}
            height={32}
            priority
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          {/* Tor ekranda nom kesilib qolmasligi uchun qisqa variant. */}
          <span className="text-base font-bold whitespace-nowrap sm:hidden">Atoyo</span>
          <span className="hidden text-lg font-bold whitespace-nowrap sm:inline">Atoyo Santexnika</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-navy-500 hover:text-aqua-600 dark:text-navy-100 dark:hover:text-aqua-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 md:block">
          <SearchBar value={searchTerm} onChange={setSearchTerm} onSubmit={handleSearchSubmit} className="max-w-md" />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-1">
          {/* Dizayn rejimi tugmasi FAQAT admin yoqqanida ko'rinadi
              (Sozlamalar → Sayt ma'lumotlari). 3D hali sinovda. */}
          {show3dMode && <UiModeSwitch className="mr-1 hidden lg:flex" />}
          <LanguageSwitcher />
          <ThemeToggle />

          <IconButton component={Link} href="/sevimlilar" aria-label={dict.favorites.title} className="!p-1.5 sm:!p-2">
            <Badge badgeContent={favoritesCount} color="error" max={99}>
              <FavoriteBorderIcon />
            </Badge>
          </IconButton>

          <IconButton component={Link} href="/savat" aria-label={dict.nav.cart} className="!p-1.5 sm:!p-2">
            <Badge badgeContent={cartCount} color="primary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>

          {userProfile ? (
            <IconButton component={Link} href="/profil" aria-label={dict.nav.profile} className="!p-1.5 sm:!p-2">
              <Avatar src={userProfile.photoURL ?? undefined} sx={{ width: 32, height: 32 }}>
                {userProfile.displayName?.[0] ?? userProfile.email?.[0] ?? "U"}
              </Avatar>
            </IconButton>
          ) : (
            <Button component={Link} href="/kirish" variant="contained" size="small" className="!ml-1 whitespace-nowrap !px-2.5 !text-xs sm:!px-4 sm:!text-sm">
              {dict.nav.login}
            </Button>
          )}
        </div>
      </div>

      {/* Katalog sahifasining o'z (jonli) qidiruvi bor - u yerda bu
          qatorni ko'rsatmaymiz, aks holda ikkita bir xil maydon chiqadi. */}
      {!pathname.startsWith("/katalog") && (
        <div className="border-t border-navy-100 px-4 py-2 md:hidden dark:border-navy-500">
          <SearchBar value={searchTerm} onChange={setSearchTerm} onSubmit={handleSearchSubmit} />
        </div>
      )}

      {/* Kichik/o'rta ekranda almashtirgich shu yerda turadi. */}
      {show3dMode && (
        <div className="flex justify-end border-t border-navy-100 px-4 py-1.5 lg:hidden dark:border-navy-500">
          <UiModeSwitch />
        </div>
      )}
    </header>
  );
}
