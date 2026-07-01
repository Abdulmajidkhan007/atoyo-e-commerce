"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", Icon: DashboardOutlinedIcon },
  { href: "/admin/katalog", label: "Katalog", Icon: Inventory2OutlinedIcon },
  { href: "/admin/buyurtmalar", label: "Buyurtmalar", Icon: ReceiptLongOutlinedIcon },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar", Icon: GroupOutlinedIcon },
  { href: "/admin/sozlamalar", label: "Sozlamalar", Icon: SettingsOutlinedIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-navy-500/40 bg-navy-900 p-4 text-white">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
        <StorefrontOutlinedIcon className="text-aqua-400" />
        Atoyo Admin
      </Link>

      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const isActive = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              isActive ? "bg-aqua-500/20 text-aqua-300" : "text-navy-100 hover:bg-navy-700"
            }`}
          >
            <Icon fontSize="small" />
            {label}
          </Link>
        );
      })}
    </aside>
  );
}
