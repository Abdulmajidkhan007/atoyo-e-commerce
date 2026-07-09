"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import { DICTIONARIES, type Dictionary } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dict: DICTIONARIES[DEFAULT_LOCALE],
  setLocale: () => {},
});

/**
 * Client komponentlar uchun til konteksti. Boshlang'ich til server
 * layout'dan (cookie asosida) keladi; til almashtirilganda cookie
 * yangilanadi — server komponentlar router.refresh() bilan qayta
 * render bo'ladi (buni LanguageSwitcher bajaradi).
 */
export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  return (
    <I18nContext.Provider value={{ locale, dict: DICTIONARIES[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
