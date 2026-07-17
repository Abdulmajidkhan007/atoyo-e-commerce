"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { signOutUser } from "@/lib/firebase/auth";
import { useAppDispatch } from "@/redux/hooks";
import { signOut as signOutAction } from "@/redux/slices/userSlice";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: DashboardOutlinedIcon },
  { href: "/admin/katalog", label: "Katalog", Icon: Inventory2OutlinedIcon },
  { href: "/admin/buyurtmalar", label: "Buyurtmalar", Icon: ReceiptLongOutlinedIcon },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", Icon: GroupOutlinedIcon },
  { href: "/admin/blog", label: "Blog", Icon: ArticleOutlinedIcon },
  { href: "/admin/xabar", label: "Xabar yuborish", Icon: CampaignOutlinedIcon },
  { href: "/admin/sozlamalar", label: "Sozlamalar", Icon: SettingsOutlinedIcon },
];

function NavLinks({ onNavigate, onLogout }: { onNavigate?: () => void; onLogout: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              isActive ? "bg-aqua-500/20 text-aqua-300" : "text-navy-100 hover:bg-navy-700"
            }`}
          >
            <Icon fontSize="small" />
            {label}
          </Link>
        );
      })}

      {/* Saytning bosh sahifasiga qaytish */}
      <Link
        href="/"
        onClick={onNavigate}
        className="mt-2 flex items-center gap-3 rounded-lg border-t border-navy-500/40 px-3 py-2.5 pt-4 text-sm text-navy-100 transition hover:bg-navy-700"
      >
        <HomeOutlinedIcon fontSize="small" />
        Saytga qaytish
      </Link>

      {/* Tizimdan chiqish */}
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          onLogout();
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-navy-700"
      >
        <LogoutOutlinedIcon fontSize="small" />
        Chiqish
      </button>
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Chiqish: client auth + server session cookie tozalanadi, bosh sahifaga.
  const handleLogout = async () => {
    await signOutUser().catch(() => {});
    dispatch(signOutAction());
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-navy-50 dark:bg-navy-950">
      {/* Doimiy yon panel - faqat katta ekranlarda (lg+) */}
      <aside className="hidden w-64 shrink-0 flex-col gap-1 border-r border-navy-500/40 bg-navy-900 p-4 text-white lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
          <StorefrontOutlinedIcon className="text-aqua-400" />
          Atoyo Admin
        </Link>
        <NavLinks onLogout={handleLogout} />
      </aside>

      {/* Mobil/planshet uchun ochiladigan drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col gap-1 bg-navy-900 p-4 text-white shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold" onClick={() => setDrawerOpen(false)}>
                <StorefrontOutlinedIcon className="text-aqua-400" />
                Atoyo Admin
              </Link>
              <IconButton size="small" onClick={() => setDrawerOpen(false)} aria-label="Yopish">
                <CloseIcon className="text-white" fontSize="small" />
              </IconButton>
            </div>
            <NavLinks onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil/planshet yuqori paneli (hamburger) */}
        <header className="flex items-center gap-3 border-b border-navy-100 bg-navy-900 px-4 py-3 text-white lg:hidden dark:border-navy-500">
          <IconButton size="small" onClick={() => setDrawerOpen(true)} aria-label="Menyu">
            <MenuIcon className="text-white" />
          </IconButton>
          {/* Logoni bosish - saytning bosh sahifasiga qaytaradi */}
          <Link href="/" className="flex items-center gap-2 font-bold">
            <StorefrontOutlinedIcon className="text-aqua-400" fontSize="small" />
            Atoyo Admin
          </Link>
          <IconButton
            component={Link}
            href="/"
            size="small"
            aria-label="Saytga qaytish"
            className="!ml-auto"
          >
            <HomeOutlinedIcon className="text-white" fontSize="small" />
          </IconButton>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
