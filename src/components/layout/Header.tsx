"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, IconButton, Avatar, Button } from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PlumbingOutlinedIcon from "@mui/icons-material/PlumbingOutlined";
import { useAppSelector } from "@/redux/hooks";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "@/components/product/SearchBar";

const NAV_LINKS = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/katalog", label: "Katalog" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "Biz haqimizda" },
  { href: "/kontakt", label: "Kontakt" },
];

export function Header() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const userProfile = useAppSelector((s) => s.user.profile);

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
          {NAV_LINKS.map((link) => (
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
          <ThemeToggle />

          <IconButton component={Link} href="/savat" aria-label="Savat">
            <Badge badgeContent={cartCount} color="primary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>

          {userProfile ? (
            <IconButton component={Link} href="/profil" aria-label="Profil">
              <Avatar src={userProfile.photoURL ?? undefined} sx={{ width: 32, height: 32 }}>
                {userProfile.displayName?.[0] ?? userProfile.email?.[0] ?? "U"}
              </Avatar>
            </IconButton>
          ) : (
            <Button component={Link} href="/kirish" variant="contained" size="small" className="!ml-1 whitespace-nowrap">
              Kirish
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
