"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Boshlang'ich til server layout'idan (cookie orqali) keladi, shuning uchun
// SSR va birinchi client render bir xil bo'ladi (hidratsiya nomuvofiqligi yo'q).
export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      // Cookie'ni yangilaymiz (bir yil), keyin server komponentlarni
      // (Footer, metadata) qayta render qilish uchun router'ni yangilaymiz.
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      setLocaleState(next);
      router.refresh();
    },
    [router],
  );

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const value = useMemo(() => ({ locale, dict, setLocale }), [locale, dict, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n I18nProvider ichida ishlatilishi kerak");
  }
  return ctx;
}

// Client komponentlarda tarjima lug'atini olish uchun.
export function useTranslation(): Dictionary {
  return useI18n().dict;
}

// Joriy tilni va uni almashtirish funksiyasini olish uchun.
export function useLocale() {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
