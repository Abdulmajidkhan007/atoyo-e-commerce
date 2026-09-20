export const LOCALES = ["uz", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

/**
 * Hozircha URL marshruti ULANGAN tillar: o'zbekcha prefiks'siz asosiy
 * manzilda, ruscha `/ru` da ishlaydi (`src/proxy.ts`). Inglizcha lug'ati
 * tayyor, lekin marshruti hali yo'q — `/en` qo'shilganda shu ro'yxatga
 * va `LOCALE_PREFIXES` ga bittasini qo'shish kifoya (`docs/ARXITEKTURA-TARIXI.md`).
 */
export const ROUTED_LOCALES: readonly Locale[] = ["uz", "ru"];

/** Har til uchun manzil prefiksi — asosiy (uz) uchun bo'sh satr. */
export const LOCALE_PREFIXES: Record<Locale, string> = {
  uz: "",
  ru: "/ru",
  en: "/en",
};

/** Til cookie'si — client'da yoziladi, server komponentlar cookies() dan o'qiydi (zaxira, `getLocale()` avval URL prefiksiga qaraydi). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Proxy joriy tilni shu sarlavhada uzatadi — `getLocale()` avval shundan o'qiydi. */
export const LOCALE_HEADER = "x-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
