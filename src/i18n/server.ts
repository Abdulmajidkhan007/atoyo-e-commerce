import "server-only";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary } from "./dictionaries";

// Server komponentlar uchun joriy tilni cookie'dan o'qiydi.
// Cookie yo'q yoki noto'g'ri bo'lsa asosiy tilga qaytadi.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

// Server komponentlar uchun to'g'ridan-to'g'ri lug'atni qaytaradi.
export async function getServerDictionary() {
  return getDictionary(await getLocale());
}
