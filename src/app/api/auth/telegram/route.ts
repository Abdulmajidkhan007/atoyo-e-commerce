import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { telegramUid, verifyTelegramLogin } from "@/lib/telegram/login-widget";
import { logAction } from "@/lib/telegram/action-log";
import type { AppUser } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://atoyo-uz.netlify.app").replace(/\/$/, "");

/** Bir martalik kod amal qilish muddati. */
const CODE_TTL_MS = 3 * 60 * 1000;

/**
 * TELEGRAM ORQALI KIRISH (widget qaytaradigan manzil).
 *
 * Telegram widget foydalanuvchini shu route'ga yuboradi. Biz:
 *   1) `hash` ni bot tokeni bilan tekshiramiz (soxta so'rov o'tmaydi);
 *   2) Firebase Auth'da `tg_<id>` foydalanuvchisini yaratamiz/topamiz;
 *   3) bir martalik kod yozib, /kirish?tg=<kod> ga qaytaramiz.
 *
 * Custom token URL'da yuborilmaydi - client uni kod bilan almashtiradi
 * (/api/auth/telegram/exchange). Shunda token brauzer tarixida qolmaydi.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const data = verifyTelegramLogin(params);

  if (!data) {
    return NextResponse.redirect(`${SITE_URL}/kirish?tgError=1`);
  }

  const uid = telegramUid(data.id);
  const displayName = [data.firstName, data.lastName].filter(Boolean).join(" ").trim() || "Mijoz";
  const auth = getAdminAuth();

  try {
    // Auth foydalanuvchisi: bor bo'lsa yangilaymiz, bo'lmasa yaratamiz.
    try {
      await auth.updateUser(uid, { displayName, photoURL: data.photoUrl });
    } catch {
      await auth.createUser({ uid, displayName, photoURL: data.photoUrl });
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(uid);
    const existing = await userRef.get();

    // Botda ro'yxatdan o'tgan bo'lsa - telefon raqamini ko'chirib olamiz.
    const botUser = await db.collection("botUsers").doc(String(data.id)).get();
    const phoneNumber = (botUser.data()?.phoneNumber as string | undefined) ?? null;

    const profile: Partial<AppUser> & { telegramId: number; telegramUsername?: string } = {
      displayName,
      photoURL: data.photoUrl ?? null,
      telegramId: data.id,
      ...(data.username ? { telegramUsername: data.username } : {}),
      ...(phoneNumber ? { phoneNumber } : {}),
    };

    if (existing.exists) {
      await userRef.set(profile, { merge: true });
    } else {
      await userRef.set({ ...profile, email: null, role: "user", createdAt: Date.now() });
      await logAction(`👤 Telegram orqali yangi mijoz: ${displayName}${data.username ? ` (@${data.username})` : ""}`);
    }

    // Bir martalik kod - client uni custom token'ga almashtiradi.
    const code = randomBytes(24).toString("hex");
    await db.collection("tgLogins").doc(code).set({
      uid,
      createdAt: Date.now(),
      expiresAt: Date.now() + CODE_TTL_MS,
      used: false,
    });

    return NextResponse.redirect(`${SITE_URL}/kirish?tg=${code}`);
  } catch (error) {
    console.error("Telegram orqali kirishda xato:", error);
    return NextResponse.redirect(`${SITE_URL}/kirish?tgError=1`);
  }
}
