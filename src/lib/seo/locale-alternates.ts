import type { Metadata } from "next";
import { DEFAULT_LOCALE, ROUTED_LOCALES, type Locale } from "@/lib/i18n/config";
import { localeHref } from "@/lib/i18n/href";

/**
 * Sahifaning `alternates` maydoni: `canonical` JORIY tilga, `languages`
 * — ULANGAN har bir tilning manziliga (`ROUTED_LOCALES` — hozircha
 * uz/ru; `/en` qo'shilganda avtomatik shu ro'yxatga tushadi), `x-default`
 * esa har doim o'zbekchaga (asosiy, prefiks'siz manzil).
 *
 * `logicalPath` — sahifaning O'ZBEKCHA (prefiks'siz) manzili, masalan
 * "/katalog" yoki "/mahsulot/123" (parametrlar bilan birga).
 */
export function localeAlternates(logicalPath: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = { "x-default": localeHref(logicalPath, DEFAULT_LOCALE) };
  for (const l of ROUTED_LOCALES) languages[l] = localeHref(logicalPath, l);

  return {
    canonical: localeHref(logicalPath, locale),
    languages,
  };
}
