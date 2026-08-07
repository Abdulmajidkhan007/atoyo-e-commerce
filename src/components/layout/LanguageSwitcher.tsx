"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/LocaleContext";

/**
 * TIL ALMASHTIRISH.
 *
 * Ro'yxatda til NOMI ham, kodi ham yozilardi ("O'zbekcha / UZ") -
 * bu ortiqcha edi. Endi DAVLAT BAYROG'I va qisqa kod (UZ / EN / RU)
 * turadi: qisqa, tez o'qiladi va tarjimaga muhtoj emas.
 *
 * Bayroqlar emoji EMAS, vektor: Windows'da bayroq emojilari
 * umuman chizilmaydi (o'rniga "UZ" harflari chiqadi) - shunda
 * ro'yxatda "UZ UZ" bo'lib ketardi.
 */

const FLAG_TITLES: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: "English",
  ru: "Русский",
};

function Flag({ locale }: { locale: Locale }) {
  const common = {
    width: 22,
    height: 16,
    viewBox: "0 0 22 16",
    className: "shrink-0 rounded-[3px] ring-1 ring-black/10",
    "aria-hidden": true,
  } as const;

  if (locale === "ru") {
    return (
      <svg {...common}>
        <rect width="22" height="16" fill="#fff" />
        <rect y="5.33" width="22" height="5.34" fill="#0039A6" />
        <rect y="10.67" width="22" height="5.33" fill="#D52B1E" />
      </svg>
    );
  }

  if (locale === "en") {
    // Buyuk Britaniya bayrog'i (soddalashtirilgan Union Jack).
    return (
      <svg {...common}>
        <rect width="22" height="16" fill="#012169" />
        <path d="M0 0 L22 16 M22 0 L0 16" stroke="#fff" strokeWidth="3.2" />
        <path d="M0 0 L22 16 M22 0 L0 16" stroke="#C8102E" strokeWidth="1.8" />
        <path d="M11 0 V16 M0 8 H22" stroke="#fff" strokeWidth="5" />
        <path d="M11 0 V16 M0 8 H22" stroke="#C8102E" strokeWidth="3" />
      </svg>
    );
  }

  // O'zbekiston: moviy / oq / yashil, orasida ingichka qizil chiziqlar.
  return (
    <svg {...common}>
      <rect width="22" height="16" fill="#0099B5" />
      <rect y="5.2" width="22" height="5.6" fill="#fff" />
      <rect y="10.8" width="22" height="5.2" fill="#1EB53A" />
      <rect y="5.0" width="22" height="0.5" fill="#CE1126" />
      <rect y="10.5" width="22" height="0.5" fill="#CE1126" />
      {/* Yarim oy: oq doira ustiga moviy doira siljitib qo'yiladi. */}
      <circle cx="4.6" cy="2.5" r="1.7" fill="#fff" />
      <circle cx="5.4" cy="2.5" r="1.7" fill="#0099B5" />
    </svg>
  );
}

export function LanguageSwitcher({ className }: { className?: string } = {}) {
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleSelect = (next: Locale) => {
    setAnchorEl(null);
    if (next === locale) return;
    setLocale(next);
    // Server komponentlar (Footer va h.k.) yangi cookie bilan qayta render bo'lsin.
    router.refresh();
  };

  return (
    <>
      <IconButton
        aria-label="Tilni almashtirish"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        className={`!p-1.5 sm:!p-2 ${className ?? "!text-navy-500 dark:!text-navy-100"}`}
      >
        <span className="flex items-center gap-1.5">
          <Flag locale={locale} />
          {/* Juda tor ekranda (320px) faqat bayroq - do'kon nomi
              qirqilib qolmasligi uchun. */}
          <span className="hidden text-xs font-bold uppercase sm:inline">{locale}</span>
        </span>
      </IconButton>

      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {LOCALES.map((l) => (
          <MenuItem
            key={l}
            selected={l === locale}
            onClick={() => handleSelect(l)}
            title={FLAG_TITLES[l]}
            className="!gap-2.5 !text-sm !font-semibold"
          >
            <Flag locale={l} />
            {l.toUpperCase()}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
