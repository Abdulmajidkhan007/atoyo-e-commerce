import { DEFAULT_LOCALE, LOCALE_PREFIXES, LOCALES, type Locale } from "./config";

/**
 * Ichki yo'lni JORIY TILGA mos manzilga aylantiradi. `path` har doim
 * "mantiqiy" (o'zbekcha, prefiks'siz) manzil, masalan "/katalog" yoki
 * "/mahsulot/123?category=...". Tashqi/nisbiy havolalar (http(s):,
 * mailto:, tel:, #, "//") o'zgarishsiz qaytadi — faqat "/" bilan
 * boshlanuvchi ICHKI yo'llar tilga moslashadi.
 *
 * Proxy'dagi marshrut (`src/proxy.ts`) va bu funksiya BIR XIL
 * `LOCALE_PREFIXES` xaritasidan foydalanadi — ikkalasi alohida
 * yozilib, bir-biridan uzilib qolmasin.
 */
export function localeHref(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const prefix = LOCALE_PREFIXES[locale];
  if (!prefix) return path;
  return path === "/" ? prefix : `${prefix}${path}`;
}

/**
 * To'liq (ehtimol `/ru` bilan boshlanuvchi) manzildan tilni va
 * "mantiqiy" (prefiks'siz, o'zbekcha) yo'lni ajratib oladi. Proxy va
 * client komponentlar (Header, pastki tab, til almashtirgich) joriy
 * bo'limni aniqlash uchun ishlatadi.
 */
export function stripLocalePrefix(pathname: string): { locale: Locale; path: string } {
  for (const locale of LOCALES) {
    const prefix = LOCALE_PREFIXES[locale];
    if (!prefix) continue; // o'zbekcha prefiks'siz - eng oxirida standart sifatida qaytadi
    if (pathname === prefix) return { locale, path: "/" };
    if (pathname.startsWith(`${prefix}/`)) return { locale, path: pathname.slice(prefix.length) };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}
