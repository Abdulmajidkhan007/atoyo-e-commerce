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
        {themeMode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
