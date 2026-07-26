"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { ensureSessionCookie } from "@/lib/firebase/auth";

/**
 * Telegram widget'idan qaytgan bir martalik kodni (?tg=...) Firebase
 * sessiyasiga aylantiradi:
 *   kod → custom token (server) → signInWithCustomToken → session cookie.
 *
 * Cookie ham o'rnatiladi, chunki buyurtma/sharh API'lari server tomonda
 * shu cookie orqali foydalanuvchini taniydi.
 */
export function useTelegramLogin(): { tgBusy: boolean; tgError: boolean } {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("tg");
  const hasError = searchParams.get("tgError") === "1";

  // Kod bo'lsa oqim darhol boshlanadi - "busa" holatini effekt ichida
  // emas, boshlang'ich qiymat sifatida beramiz (cascading render bo'lmaydi).
  const [tgBusy, setTgBusy] = useState(Boolean(code));
  const [tgError, setTgError] = useState(hasError);

  useEffect(() => {
    if (!code) return;
    let active = true;

    fetch("/api/auth/telegram/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        const data = (await res.json()) as { token?: string; error?: string };
        if (!res.ok || !data.token) throw new Error(data.error ?? "failed");
        await signInWithCustomToken(getFirebaseAuth(), data.token);
        await ensureSessionCookie();
        return true;
      })
      .then(() => {
        if (active) router.replace("/profil");
      })
      .catch(() => {
        if (active) {
          setTgError(true);
          router.replace("/kirish");
        }
      })
      .finally(() => {
        if (active) setTgBusy(false);
      });

    return () => {
      active = false;
    };
  }, [code, router]);

  return { tgBusy, tgError };
}
