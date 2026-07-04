import { defaultLocale, type Locale } from "../config";
import uz, { type Dictionary } from "./uz";
import ru from "./ru";
import en from "./en";

// Lug'atlar oddiy TS obyektlari - bundle ichida keladi, shuning uchun
// `getDictionary` sinxron va ham server, ham client tomonda ishlaydi
// (bu fayl `server-only` import qilmasligi shart).
const dictionaries: Record<Locale, Dictionary> = { uz, ru, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export type { Dictionary };
