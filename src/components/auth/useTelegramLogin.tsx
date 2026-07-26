"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ensureSessionCookie } from "@/lib/firebase/auth";

/**
 * TELEGRAM ORQALI KIRISH (deep link).
 *
 * Telegram Login Widget domenni BotFather'da `/setdomain` bilan
 * bog'lashni talab qiladi va u yerda biror nomuvofiqlik bo'lsa
 * "Bot domain invalid" deb turadi. Shu sababli widget o'rniga botning
 * o'zi ishlatiladi:
 *
 *   1) /api/auth/telegram/start -> bir martalik kod + t.me havolasi;
 *   2) foydalanuvchi botda "Start" bosadi (yangi oynada);
 *   3) /api/auth/telegram/exchange kodni so'rab turadi: 202 = kutilmoqda,
 *      200 = custom token -> signInWithCustomToken + session cookie.
 *
 * Cookie ham o'rnatiladi, chunki buyurtma/sharh API'lari server tomonda
 * shu cookie orqali foydalanuvchini taniydi.
 */

const POLL_INTERVAL_MS = 2000;
/** Kod 5 daqiqa yashaydi - shuncha vaqt so'rab turamiz. */
const MAX_ATTEMPTS = Math.ceil((5 * 60 * 1000) / POLL_INTERVAL_MS);

export interface TelegramLoginState {
  tgBusy: boolean;
  tgError: boolean;
  /** Bot oynasi ochilgan va tasdiq kutilmoqda. */
  tgWaiting: boolean;
  startTelegramLogin: () => void;
}

export function useTelegramLogin(): TelegramLoginState {
  const router = useRouter();
  const [tgBusy, setTgBusy] = useState(false);
  const [tgError, setTgError] = useState(false);
  const [tgWaiting, setTgWaiting] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const startTelegramLogin = useCallback(() => {
    setTgError(false);
    setTgBusy(true);

    // Popup blokerlari faqat bosish paytidagi `window.open` ga ruxsat
    // beradi, shuning uchun oynani darhol ochib, keyin havolani
    // yuklaymiz.
    const popup = window.open("", "_blank");

    const finish = (ok: boolean) => {
      if (cancelledRef.current) return;
      setTgBusy(false);
      setTgWaiting(false);
      if (ok) {
        router.replace("/profil");
      } else {
        setTgError(true);
      }
    };

    const poll = async (code: string, attempt: number): Promise<void> => {
      if (cancelledRef.current) return;
      if (attempt >= MAX_ATTEMPTS) {
        finish(false);
        return;
      }

      const res = await fetch("/api/auth/telegram/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.status === 202) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        return poll(code, attempt + 1);
      }

      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (!res.ok || !data.token) throw new Error("failed");

      await signInWithCustomToken(getFirebaseAuth(), data.token);
      await ensureSessionCookie();
      popup?.close();
      finish(true);
    };

    fetch("/api/auth/telegram/start", { method: "POST" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { code?: string; url?: string };
        if (!res.ok || !data.code || !data.url) throw new Error("failed");

        if (popup) popup.location.href = data.url;
        else window.location.href = data.url;

        if (!cancelledRef.current) setTgWaiting(true);
        return poll(data.code, 0);
      })
      .catch(() => {
        popup?.close();
        finish(false);
      });
  }, [router]);

  return { tgBusy, tgError, tgWaiting, startTelegramLogin };
}
