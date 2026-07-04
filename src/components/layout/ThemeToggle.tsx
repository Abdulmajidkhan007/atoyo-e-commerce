"use client";

import { IconButton, Tooltip } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/uiSlice";
import { useTranslation } from "@/i18n/I18nProvider";

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((s) => s.ui.themeMode);
  const t = useTranslation();

  return (
    <Tooltip title={themeMode === "dark" ? t.theme.toLight : t.theme.toDark}>
      <IconButton onClick={() => dispatch(toggleTheme())} aria-label={t.theme.toggle}>
        {themeMode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
