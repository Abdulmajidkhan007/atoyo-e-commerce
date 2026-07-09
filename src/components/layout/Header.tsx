"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, IconButton, Avatar, Button } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PlumbingOutlinedIcon from "@mui/icons-material/PlumbingOutlined";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SearchBar } from "@/components/product/SearchBar";

export function Header() {
  const router = useRouter();
  const { dict } = useI18n();
  const [searchTerm, setSearchTerm] = useState("");
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const userProfile = useAppSelector((s) => s.user.profile);

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
    <header className="sticky top-0 z-30 border-b border-navy-100 bg-white/95 backdrop-blur dark:border-navy-500 dark:bg-navy-900/95">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-navy-900 dark:text-white">
          <PlumbingOutlinedIcon className="text-aqua-500" />
          <span className="text-lg font-bold whitespace-nowrap">Atoyo Santexnika</span>
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

        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />

          <IconButton component={Link} href="/savat" aria-label={dict.nav.cart}>
            <Badge badgeContent={cartCount} color="primary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>

          {userProfile ? (
            <IconButton component={Link} href="/profil" aria-label={dict.nav.profile}>
              <Avatar src={userProfile.photoURL ?? undefined} sx={{ width: 32, height: 32 }}>
                {userProfile.displayName?.[0] ?? userProfile.email?.[0] ?? "U"}
              </Avatar>
            </IconButton>
          ) : (
            <Button component={Link} href="/kirish" variant="contained" size="small" className="!ml-1 whitespace-nowrap">
              {dict.nav.login}
            </Button>
          )}
        </div>
      </div>

      <div className="border-t border-navy-100 px-4 py-2 md:hidden dark:border-navy-500">
        <SearchBar value={searchTerm} onChange={setSearchTerm} onSubmit={handleSearchSubmit} />
      </div>
    </header>
  );
}
