import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "./admin";
import { isOwner, isStaff, hasPermission, type PermissionKey } from "@/lib/permissions";
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
    const user: AppUser = { uid: decoded.uid, ...data };

    // Loyiha egasining emaili bilan kirilgan bo'lsa - rol doim "owner".
    // Firestore'dagi yozuv boshqa bo'lsa (masalan admin qo'lda
    // o'zgartirgan bo'lsa) ham egalik huquqi yo'qolmaydi; hujjat esa
    // fon rejimida to'g'rilanadi.
    if (isOwner(user) && user.role !== "owner") {
      userDoc.ref.update({ role: "owner" }).catch(() => {});
      return { ...user, role: "owner" };
    }

    return user;
  } catch {
    // Yaroqsiz, muddati o'tgan yoki bekor qilingan cookie - tinch fail bo'ladi.
    return null;
  }
}

/**
 * MOBIL ILOVA UCHUN: avval session cookie, bo'lmasa `Authorization:
 * Bearer <idToken>` sarlavhasi tekshiriladi.
 *
 * Saytda httpOnly cookie ishlatiladi, lekin React Native ilovasida
 * cookie yo'q - u Firebase Auth ID tokenini sarlavhada yuboradi.
 * Ikkalasi ham bir xil `AppUser` qaytaradi, shuning uchun route'lar
 * mijoz turini bilishi shart emas.
 */
export async function getAppUserFromRequest(request: Request): Promise<AppUser | null> {
  const fromCookie = await getCurrentAppUser();
  if (fromCookie) return fromCookie;

  const header = request.headers.get("authorization") ?? "";
  const idToken = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!idToken) return null;

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken, true /* checkRevoked */);
    const userDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    const user: AppUser = { uid: decoded.uid, ...(userDoc.data() as Omit<AppUser, "uid">) };
    if (isOwner(user) && user.role !== "owner") return { ...user, role: "owner" };
    return user;
  } catch {
    return null;
  }
}

/**
 * Admin panelga kirish huquqi (owner yoki admin). Har bir route'da
 * alohida yozilmasligi uchun markazlashtirilgan - Firestore rolini
 * bir joydan tekshiradi.
 */
export async function requireAdminUser(): Promise<AppUser | null> {
  const user = await getCurrentAppUser();
  return isStaff(user) ? user : null;
}

/**
 * ANIQ HUQUQ talab qiladigan route'lar uchun (masalan mahsulot yozish
 * "products", e'lon yuborish "broadcast"). Owner har doim o'tadi; admin
 * faqat owner bergan ruxsat bo'lsa. Ruxsat bo'lmasa null qaytadi.
 */
export async function requirePermission(
  key: PermissionKey,
  /**
   * Mobil ilova cookie yubormaydi - `Authorization: Bearer <idToken>`
   * sarlavhasi bilan keladi. So'rov berilsa u ham tekshiriladi, ya'ni
   * bitta route'dan sayt ham, ilova ham foydalana oladi.
   */
  request?: Request
): Promise<AppUser | null> {
  const user = request ? await getAppUserFromRequest(request) : await getCurrentAppUser();
  return hasPermission(user, key) ? user : null;
}

/**
 * Rol/huquq boshqaruvi: loyiha egasi yoki egasi "roles" huquqini bergan
 * admin. Egasining o'zini hech kim o'zgartira olmaydi (route ichida
 * alohida tekshiriladi).
 */
export async function requireRoleManager(): Promise<AppUser | null> {
  const user = await getCurrentAppUser();
  if (isOwner(user)) return user;
  return hasPermission(user, "roles") ? user : null;
}

/** Faqat loyiha egasi bajara oladigan amallar. */
export async function requireOwner(): Promise<AppUser | null> {
  const user = await getCurrentAppUser();
  return isOwner(user) ? user : null;
}
