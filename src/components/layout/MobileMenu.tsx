"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/lib/i18n/LocaleLink";
import { Drawer, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SupportAgentOutlinedIcon from "@mui/icons-material/SupportAgentOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LoginIcon from "@mui/icons-material/Login";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
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
 * KO'RINISHI SAYTNIKI BILAN BIR XIL (`docs/UI-SHISHA.md`): panel
 * suzuvchi qatlam, shuning uchun `glass-strong`; header'dagi kabi
 * brend qatori, ikonka uchun aqua "chip", bandlar esa `rounded-xl2`.
 * Ilgari bu oddiy oq Drawer edi va saytning qolgan qismidan ajralib
 * turardi.
 *
 * Kompyuterda menyu KO'RINMAYDI — u yerda yuqori qatordagi havolalar
 * va ikonkalar joyida qoladi.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { dict } = useI18n();
  const userProfile = useAppSelector((s) => s.user.profile);

  const pages = [
    { href: "/katalog", label: dict.nav.catalog, Icon: GridViewOutlinedIcon },
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
        slotProps={{
          paper: {
            // Shisha panel: chap chekkasi yumaloq, o'ng chekkasi ekran qirrasi.
            className: "glass-strong w-80 max-w-[85vw] !rounded-l-2xl !border-0",
          },
        }}
      >
        {/* Brend qatori — header'dagi bilan bir xil, shunda menyu
            saytning davomi bo'lib ko'rinadi, boshqa oyna emas. */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <Image
            src="/logo.jpg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-base font-bold text-navy-900 dark:text-white">
            Atoyo Santexnika
          </span>
          <IconButton onClick={() => setOpen(false)} aria-label={dict.common.close} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        <div className="mx-4 h-px bg-navy-100/70 dark:bg-navy-500/60" />

        <nav className="flex flex-col gap-1 p-3">
          {pages.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 rounded-xl2 px-3 py-3 text-sm font-semibold text-navy-900 transition hover:bg-aqua-50 dark:text-white dark:hover:bg-navy-600"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-600 dark:bg-navy-600 dark:text-aqua-300">
                <Icon fontSize="small" />
              </span>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <ChevronRightIcon
                fontSize="small"
                className="shrink-0 text-navy-200 transition group-hover:text-aqua-600 dark:text-navy-300"
              />
            </Link>
          ))}
        </nav>

        {/* Profil/Kirish — pastda, sahifalardan ajratilgan holda:
            bu "sahifa" emas, hisobga kirish. */}
        <div className="mt-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-2 h-px bg-navy-100/70 dark:bg-navy-500/60" />
          <Link
            href={account.href}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl2 bg-navy-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-navy-700 dark:bg-aqua-500 dark:text-navy-900 dark:hover:bg-aqua-400"
          >
            <account.Icon fontSize="small" />
            <span className="min-w-0 flex-1 truncate">{account.label}</span>
          </Link>
        </div>
      </Drawer>
    </>
  );
}
