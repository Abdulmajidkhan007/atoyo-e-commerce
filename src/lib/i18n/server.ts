import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

/** Server komponentda joriy tilni cookie'dan o'qiydi. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server komponent uchun joriy til lug'ati. */
export async function getDictionary(): Promise<Dictionary> {
  return DICTIONARIES[await getLocale()];
}
