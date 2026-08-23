import type { SocialProvider } from "./auth";

/**
 * QAYSI KIRISH TUGMALARI KO'RSATILADI.
 *
 * Firebase konsolida yoqilmagan provayder bosilsa `auth/operation-not-allowed`
 * xatosi chiqadi - mijoz uchun bu shunchaki "ishlamaydigan tugma". Shuning
 * uchun ro'yxat `NEXT_PUBLIC_AUTH_PROVIDERS` env orqali boshqariladi:
 *
 *   NEXT_PUBLIC_AUTH_PROVIDERS="google,telegram,apple,microsoft,facebook,phone"
 *
 * Env berilmasa - avvalgi holat (Google + Telegram) saqlanadi.
 *
 * WhatsApp/WeChat Firebase Auth'da yo'q; ularning o'rniga "phone"
 * (SMS kod) va Telegram kirishi ishlatiladi.
 */
export type AuthMethod = SocialProvider | "telegram" | "phone";

const DEFAULT_METHODS: AuthMethod[] = ["google", "telegram"];

const ALL_METHODS: AuthMethod[] = ["google", "telegram", "apple", "microsoft", "facebook", "phone"];

export function enabledAuthMethods(): AuthMethod[] {
  const raw = process.env.NEXT_PUBLIC_AUTH_PROVIDERS?.trim();
  if (!raw) return DEFAULT_METHODS;

  const wanted = raw
    .toLowerCase()
    .split(/[,\s]+/)
    .filter(Boolean);
  const list = ALL_METHODS.filter((method) => wanted.includes(method));
  return list.length > 0 ? list : DEFAULT_METHODS;
}

/** Tugma yozuvlari (brend nomlari tarjima qilinmaydi). */
export const AUTH_METHOD_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  apple: "Apple",
  microsoft: "Microsoft",
  facebook: "Facebook",
};
