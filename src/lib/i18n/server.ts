import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALE_HEADER, isLocale, type Locale } from "./config";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

/**
 * Server komponentda joriy tilni aniqlaydi: AVVAL manzil prefiksidan
 * (`src/proxy.ts` `x-locale` sarlavhasiga yozadi - `/ru/...` bo'lsa
 * "ru"), so'ngra (sarlavha yo'q bo'lgan noodatiy holatlar uchun)
 * cookie'dan. Manzil har doim mavjud bo'lgani uchun cookie deyarli
 * ishlatilmaydi - u faqat zaxira.
 */
export async function getLocale(): Promise<Locale> {
  const fromHeader = (await headers()).get(LOCALE_HEADER);
  if (isLocale(fromHeader)) return fromHeader;

  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server komponent uchun joriy til lug'ati. */
export async function getDictionary(): Promise<Dictionary> {
  return DICTIONARIES[await getLocale()];
}
