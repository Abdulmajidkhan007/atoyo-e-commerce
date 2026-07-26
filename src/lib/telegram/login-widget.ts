import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * TELEGRAM LOGIN WIDGET ma'lumotlarini tekshirish.
 *
 * Widget foydalanuvchini bizning `auth-url` ga yuboradi va query
 * parametrlarida id/first_name/username/photo_url/auth_date/hash beradi.
 * Bu ma'lumotni ISHONCHLI deb qabul qilish mumkin emas - har kim
 * qo'lda shunday URL yasashi mumkin. Shuning uchun Telegram bergan
 * `hash` bot tokeni yordamida qayta hisoblanadi:
 *
 *   secret       = SHA256(bot_token)
 *   check_string = "key=value" larning alifbo tartibida "\n" bilan ulanishi
 *   hash         = HMAC_SHA256(check_string, secret)
 *
 * Rasmiy hujjat: https://core.telegram.org/widgets/login#checking-authorization
 */

export interface TelegramLoginData {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  authDate: number;
}

/** Widget ma'lumoti eskirgan hisoblanadigan muddat (takroriy ishlatishga qarshi). */
const MAX_AGE_SECONDS = 300;

export function verifyTelegramLogin(params: Record<string, string>): TelegramLoginData | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  const { hash, ...rest } = params;
  if (!hash || !rest.id || !rest.auth_date) return null;

  const checkString = Object.keys(rest)
    .filter((key) => rest[key] !== undefined && rest[key] !== "")
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join("\n");

  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");

  // Uzunligi teng bo'lmasa timingSafeEqual xato beradi - avval tekshiramiz.
  if (expected.length !== hash.length) return null;
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"))) return null;

  const authDate = Number(rest.auth_date);
  if (!Number.isFinite(authDate)) return null;
  if (Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) return null;

  return {
    id: Number(rest.id),
    firstName: rest.first_name ?? "Mijoz",
    lastName: rest.last_name,
    username: rest.username,
    photoUrl: rest.photo_url,
    authDate,
  };
}

/** Telegram foydalanuvchisi uchun Firebase uid. */
export function telegramUid(telegramId: number): string {
  return `tg_${telegramId}`;
}
