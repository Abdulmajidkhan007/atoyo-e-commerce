"use client";

import { useState } from "react";
import Link from "next/link";
import { Divider, Drawer, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LoginIcon from "@mui/icons-material/Login";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";

/**
 * TELEFON UCHUN "BURGER" MENYUSI.
 *
 * Nega kerak: telefonda pastki tabda 6 ta band bor edi (Blog, Haqida,
 * Kontakt, Profil ham o'sha yerda) va SAVAT umuman yo'q edi — do'kon
 * uchun bu tartib xatosi. Endi pastki tabda faqat XARID yo'li
 * (bosh sahifa, katalog, sevimlilar, savat), qolgan sahifalar esa shu
 * menyuda.
 *
 * Kompyuterda menyu KO'RINMAYDI — u yerda yuqori qatordagi havolalar
 * va ikonkalar joyida qoladi.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { dict } = useI18n();
  const userProfile = useAppSelector((s) => s.user.profile);

  const pages = [
    { href: "/blog", label: dict.nav.blog, Icon: ArticleOutlinedIcon },
    { href: "/about", label: dict.nav.about, Icon: InfoOutlinedIcon },
    { href: "/kontakt", label: dict.nav.contact, Icon: SupportAgentOutlinedIcon },
  ];

  const account = userProfile
    ? { href: "/profil", label: dict.nav.profile, Icon: PersonOutlineIcon }
    : { href: "/kirish", label: dict.nav.login, Icon: LoginIcon };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label={dict.nav.menu}
        aria-expanded={open}
        className="!p-1.5 md:!hidden"
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { className: "w-72 max-w-[80vw]" } }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-base font-bold text-navy-900 dark:text-white">{dict.nav.menu}</span>
          <IconButton onClick={() => setOpen(false)} aria-label={dict.common.close} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <Divider />

        <nav className="flex flex-col p-2">
          {[...pages, account].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-navy-900 transition hover:bg-navy-50 dark:text-white dark:hover:bg-navy-700"
            >
              <Icon fontSize="small" className="text-navy-300" />
              {label}
            </Link>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
