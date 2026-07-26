"use client";

import { Button } from "@mui/material";

/**
 * TELEGRAM ORQALI KIRISH tugmasi. Telegram'ning o'z widget'i (iframe)
 * emas - oddiy tugma, shuning uchun Google tugmasi bilan bir xil
 * ko'rinishda bo'ladi va `/setdomain` talab qilinmaydi.
 * Oqim `useTelegramLogin` ichida (deep link + kod almashish).
 */
export function TelegramLoginButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <Button
      onClick={onClick}
      variant="outlined"
      size="medium"
      disabled={disabled}
      title={label}
      startIcon={<TelegramGlyph />}
      className="!normal-case"
    >
      Telegram
    </Button>
  );
}

/** Telegram logotipi (inline SVG - tashqi so'rov yo'q). */
function TelegramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.94 4.3 18.9 19.1c-.23 1.03-.85 1.28-1.72.8l-4.75-3.5-2.29 2.2c-.25.25-.47.47-.95.47l.34-4.83 8.8-7.95c.38-.34-.08-.53-.6-.19L6.9 13.02 2.2 11.55c-1.02-.32-1.04-1.02.21-1.5l18.15-7c.85-.31 1.6.2 1.38 1.25Z" />
    </svg>
  );
}
