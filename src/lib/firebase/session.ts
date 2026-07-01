import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "./admin";
import type { AppUser } from "@/types/user";

export const SESSION_COOKIE_NAME = "__session";

/**
 * Bu cookie Firebase ID tokenining o'zini saqlaydi (Firebase'ning alohida
 * "session cookie" formati emas). Sabab: ID tokenlar
 * `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
 * manzilida ochiq, standart JWKS (JSON Web Key Set) formatida
 * hujjatlashtirilgan - shu tufayli middleware.ts ichida Edge runtime'da
 * (Node.js Admin SDK'siz) `jose` kutubxonasi bilan mustaqil tekshirish
 * mumkin. ID token ~1 soatda eskiradi, shuning uchun klient tomonda
 * `onIdTokenChanged` orqali muntazam yangilanadi (`lib/firebase/auth.ts`).
 */

/** ID tokenni Admin SDK bilan tasdiqlaydi va shu asosda session cookie qiymatini qaytaradi. */
export async function verifyIdTokenForCookie(idToken: string): Promise<string> {
  await getAdminAuth().verifyIdToken(idToken, true /* checkRevoked */);
  return idToken;
}

/**
 * Joriy so'rovdagi cookie'ni tekshiradi va Firestore'dagi haqiqiy rol
 * bilan birga foydalanuvchini qaytaradi. Cookie soxta, eskirgan yoki
 * bekor qilingan bo'lsa `null` qaytadi.
 *
 * Faqat Server Component / Route Handler ichida ishlatiladi (Node.js runtime talab qiladi).
 */
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const idToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken, true /* checkRevoked */);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();

    if (!userDoc.exists) return null;

    const data = userDoc.data() as Omit<AppUser, "uid">;
    return { uid: decoded.uid, ...data };
  } catch {
    // Yaroqsiz, muddati o'tgan yoki bekor qilingan token - tinch fail bo'ladi.
    return null;
  }
}
