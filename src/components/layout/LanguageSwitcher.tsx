"use client";

import { useState } from "react";
import { IconButton, Menu, MenuItem, ListItemText, Tooltip } from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import CheckIcon from "@mui/icons-material/Check";
import { useLocale, useTranslation } from "@/i18n/I18nProvider";
import { locales, localeNames, localeShort } from "@/i18n/config";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const t = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={t.language.change}>
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={t.language.change}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          className="gap-1"
        >
          <TranslateIcon fontSize="small" />
          <span className="text-xs font-semibold">{localeShort[locale]}</span>
        </IconButton>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        {locales.map((code) => (
          <MenuItem
            key={code}
            selected={code === locale}
            onClick={() => {
              setLocale(code);
              setAnchorEl(null);
            }}
            className="gap-2"
          >
            <ListItemText>{localeNames[code]}</ListItemText>
            {code === locale && <CheckIcon fontSize="small" className="text-aqua-500" />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
