import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "./admin";
import type { AppUser } from "@/types/user";

export const SESSION_COOKIE_NAME = "__session";

/**
 * Firebase'ning o'zining "session cookie" formati ishlatiladi (oddiy ID
 * token emas). Bu Google tomonidan tavsiya etilgan standart yondashuv:
 * uzoq muddatli (bu yerda 14 kun), bekor qilinishi mumkin
 * (`revokeRefreshTokens` orqali) va Admin SDK bilan bir marta
 * `createSessionCookie` chaqirilib yaratiladi. Next.js v16'da Proxy
 * (avvalgi "middleware") standart holatda Node.js runtime'da ishlaganu
 * uchun bu cookie `src/proxy.ts` ichida ham to'g'ridan-to'g'ri Admin SDK
 * bilan tekshiriladi - alohida Edge-mos tekshiruv kerak emas.
 */
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 kun

export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_MS / 1000;

/**
 * Joriy so'rovdagi session cookie'ni tekshiradi va Firestore'dagi haqiqiy
 * rol bilan birga foydalanuvchini qaytaradi. Cookie soxta, eskirgan yoki
 * bekor qilingan bo'lsa `null` qaytadi.
 *
 * Faqat Server Component / Route Handler ichida ishlatiladi (Node.js runtime talab qiladi).
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true /* checkRevoked */);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) return null;

    const data = userDoc.data() as Omit<AppUser, "uid">;
    return { uid: decoded.uid, ...data };
  } catch {
    // Yaroqsiz, muddati o'tgan yoki bekor qilingan cookie - tinch fail bo'ladi.
    return null;
  }
}
