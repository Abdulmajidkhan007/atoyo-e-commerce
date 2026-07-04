// Ilova qo'llab-quvvatlaydigan tillar. `uz` - asosiy (fallback) til.
export const locales = ["uz", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uz";

// Til tanlovi shu nomdagi cookie'da saqlanadi. Cookie ham server
// (render vaqtida `cookies()` orqali), ham client tomondan o'qiladi.
export const LOCALE_COOKIE = "locale";

// Til almashtirgichda ko'rsatiladigan nomlar (har biri o'z tilida yoziladi).
export const localeNames: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

// Til tugmasidagi qisqa belgilar.
export const localeShort: Record<Locale, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
