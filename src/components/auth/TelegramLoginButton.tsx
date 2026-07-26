"use client";

import { useEffect, useRef } from "react";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "Atoyo_uz_bot";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app";

/**
 * TELEGRAM LOGIN WIDGET. Telegram'ning o'z skripti <script> sifatida
 * qo'shiladi va o'zi tugma (iframe) chizadi - uni CSS bilan
 * o'zgartirib bo'lmaydi, faqat `data-size` va `data-radius` bilan.
 *
 * Tugma bosilganda Telegram foydalanuvchini `data-auth-url` ga
 * yo'naltiradi: /api/auth/telegram (u yerda hash tekshiriladi).
 *
 * MUHIM: ishlashi uchun BotFather'da `/setdomain` bilan sayt domeni
 * botga bog'langan bo'lishi shart.
 */
export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.childElementCount > 0) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?24";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-auth-url", `${SITE_URL}/api/auth/telegram`);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
  }, []);

  return <div ref={containerRef} className="flex min-h-10 items-center justify-center" />;
}
