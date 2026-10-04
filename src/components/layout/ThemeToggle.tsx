"use client";

import { IconButton, Tooltip } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { toggleTheme } from "@/redux/slices/uiSlice";

export function ThemeToggle({ className }: { className?: string } = {}) {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((s) => s.ui.themeMode);

  return (
    <Tooltip title={themeMode === "dark" ? "Yorug' rejim" : "Tungi rejim"}>
      <IconButton onClick={() => dispatch(toggleTheme())} aria-label="Temani almashtirish" className={`!p-1.5 sm:!p-2 ${className ?? ""}`}>
        {/* Ikona `.dark` klassidan (CSS) tanlanadi, redux'dan EMAS: sovuq
            ochilishda REHYDRATE hydration'dan oldin keladi va server
            chizgan ikona almashmay qolardi (ARXITEKTURA-TARIXI 40). */}
        <LightModeOutlinedIcon className="!hidden dark:!inline-block" />
        <DarkModeOutlinedIcon className="dark:!hidden" />
      </IconButton>
    </Tooltip>
  );
}
