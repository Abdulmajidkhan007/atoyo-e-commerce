/**
 * KUNLIK HISOB KALITLARI (sof mantiq — testlanadi).
 *
 * Kanal postidagi tugma bosilishlari bitta hujjatda, kun bo'yicha
 * saqlanadi: `days: { "2026-08-19": 4, ... }`. Alohida kolleksiya
 * ochilmagani uchun "oxirgi 7 kun" hisobi shu kalitlar ustida
 * yuritiladi. Fayl `server-only` EMAS — u faqat sana arifmetikasi.
 */

const DAY_MS = 86_400_000;

/** Kunlik kalit: `YYYY-MM-DD` (UTC — solishtirish uchun barqaror). */
export function dayKey(at: number): string {
  return new Date(at).toISOString().slice(0, 10);
}

/** Oxirgi `count` kundagi hisoblar yig'indisi (bugundan orqaga). */
export function sumRecentDays(
  days: Record<string, number> | undefined,
  count: number,
  now: number
): number {
  if (!days) return 0;
  let sum = 0;
  for (let i = 0; i < count; i += 1) {
    sum += days[dayKey(now - i * DAY_MS)] ?? 0;
  }
  return sum;
}

/**
 * Hujjat cheksiz o'smasin: `max` tadan ortiq kunlik kalit bo'lsa
 * ENG ESKILARI qaytariladi (chaqiruvchi ularni o'chiradi).
 * Kalitlar `YYYY-MM-DD` bo'lgani uchun oddiy matn tartibi = sana tartibi.
 */
export function staleDayKeys(days: Record<string, number> | undefined, max: number): string[] {
  const keys = Object.keys(days ?? {});
  if (keys.length <= max) return [];
  return keys.sort().slice(0, keys.length - max);
}
