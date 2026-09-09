/**
 * FIREBASE AUTH XATOSINI TUSHUNARLI SABABGA AYLANTIRISH.
 *
 * Ilgari kirishdagi HAR QANDAY xato "Kirishda xatolik yuz berdi"
 * bo'lib chiqardi. Natijada haqiqiy sabab (parol xato? domen ruxsat
 * etilmagan? internet yo'q?) na mijozga, na adminga ko'rinardi va
 * muammoni topib bo'lmasdi.
 *
 * Bu funksiya Firebase kodini bir nechta ANIQ holatga ajratadi;
 * tanilmagani "generic" bo'lib qoladi (kod konsolga yoziladi).
 */

export type AuthErrorKind =
  | "wrongCredentials"
  | "tooMany"
  | "network"
  | "emailInUse"
  | "weakPassword"
  | "domain"
  | "generic";

/** Firebase xatosidan `auth/...` kodini ajratadi. */
export function authErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return "";
}

export function authErrorKind(error: unknown): AuthErrorKind {
  const code = authErrorCode(error);
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (/auth\/(invalid-credential|invalid-login-credentials|wrong-password|user-not-found|invalid-email)/.test(code)) {
    return "wrongCredentials";
  }
  if (code === "auth/too-many-requests") return "tooMany";
  if (code === "auth/network-request-failed") return "network";
  if (code === "auth/email-already-in-use") return "emailInUse";
  if (code === "auth/weak-password") return "weakPassword";
  // Domen ruxsati: yangi domenga o'tilganda eng ko'p uchraydigan
  // sabab. Ikki xil chegaradan kelishi mumkin — Authentication'dagi
  // "Authorized domains" va API kalitidagi "Website restrictions"
  // (u `requests-from-referer ... are blocked` deb keladi).
  if (
    code === "auth/unauthorized-domain" ||
    code === "auth/operation-not-allowed" ||
    /requests-from-referer|API key not valid|blocked/i.test(message)
  ) {
    return "domain";
  }
  return "generic";
}
