"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconButton, Menu, MenuItem, ListItemText } from "@mui/material";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/LocaleContext";

const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  en: "English",
  ru: "Русский",
};

export function LanguageSwitcher() {
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
        className="!text-navy-500 dark:!text-navy-100"
      >
        <span className="flex items-center gap-1">
          <LanguageOutlinedIcon fontSize="small" />
          <span className="text-xs font-bold uppercase">{locale}</span>
        </span>
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {LOCALES.map((l) => (
          <MenuItem key={l} selected={l === locale} onClick={() => handleSelect(l)}>
            <ListItemText primary={LOCALE_LABELS[l]} secondary={l.toUpperCase()} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
