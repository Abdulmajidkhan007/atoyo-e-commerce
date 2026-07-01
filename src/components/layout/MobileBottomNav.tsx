"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useAppSelector } from "@/redux/hooks";

const TABS = [
  { href: "/", label: "Bosh sahifa", icon: HomeOutlinedIcon },
  { href: "/katalog", label: "Katalog", icon: CategoryOutlinedIcon },
  { href: "/savat", label: "Savat", icon: ShoppingCartOutlinedIcon },
  { href: "/profil", label: "Profil", icon: PersonOutlineIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useAppSelector((s) => s.cart.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-navy-100 bg-white/95 backdrop-blur md:hidden dark:border-navy-500 dark:bg-navy-900/95">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
