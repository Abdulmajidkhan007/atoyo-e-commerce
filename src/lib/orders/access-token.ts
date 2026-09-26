import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * BUYURTMA SAHIFASIGA KIRISH KALITI.
 *
 * Tizimga kirmagan ("1 klikda") mijoz o'z buyurtmasini va o'tkazma
 * sahifasini faqat havola orqali ochadi: `/buyurtma/<id>?t=<kalit>`.
 * Bazada kalitning O'ZI emas, SHA-256 xeshi saqlanadi — baza o'qilib
 * qolsa ham havolani tiklab bo'lmaydi.
 *
 * Buyurtma ID si (Firestore avtomatik ID) yolg'iz yetarli emas:
 * u Telegram xabarida, admin panelda va loglarda ko'rinadi.
 */
export function newOrderAccessToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashOrderAccessToken(token) };
}

export function hashOrderAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Doimiy vaqtli solishtirish (vaqt bo'yicha taxmin qilib bo'lmasin). */
export function verifyOrderAccessToken(token: string | null | undefined, hash: string | null | undefined): boolean {
  if (!token || !hash || token.length > 200) return false;
  const actual = Buffer.from(hashOrderAccessToken(token), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
