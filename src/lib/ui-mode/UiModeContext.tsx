"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_UI_MODE,
  UI_MODE_ATTRIBUTE,
  persistUiMode,
  readStoredUiMode,
  type UiMode,
} from "./config";

/**
 * REJIM KONTEKSTI.
 *
 * Butun saytda rejim BITTA joydan o'qiladi - `useUiMode()`. Komponentlar
 * `localStorage` ga o'zi tegmaydi, shuning uchun keyinchalik saqlash
 * usuli o'zgarsa (masalan serverga ko'chsa) faqat shu fayl o'zgaradi.
 *
 * Nega boshlang'ich qiymat STANDART rejim?
 * Server HTML ni standart rejimda chizadi. Agar client birinchi
 * renderda darhol saqlangan rejimni ishlatsa, React "hydration
 * mismatch" beradi. Shuning uchun saqlangan qiymat mount'dan KEYIN
 * qo'llanadi; ko'z bilan sezilmasligi uchun esa `<html>` dagi
 * `data-ui-mode` atributi sahifa bo'yalishidan oldin qo'yilgan
 * (`UI_MODE_INIT_SCRIPT`) va CSS 3D qatlamini darrov yashiradi.
 */

interface UiModeState {
  mode: UiMode;
  /** Saqlangan tanlov o'qib bo'lindimi (birinchi renderda `false`). */
  ready: boolean;
  isModern: boolean;
  setMode: (mode: UiMode) => void;
  toggle: () => void;
}

const UiModeContext = createContext<UiModeState | null>(null);

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UiMode>(DEFAULT_UI_MODE);
  const [ready, setReady] = useState(false);

  // Saqlangan tanlov - faqat brauzerda, mount'dan keyin.
  useEffect(() => {
    const stored = readStoredUiMode();
    // Mikrovazifada: effekt ichida to'g'ridan-to'g'ri setState chaqirish
    // React compiler qoidasini buzadi va ortiqcha render beradi.
    const timer = setTimeout(() => {
      setModeState(stored);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // CSS uchun atribut har o'zgarishda sinxron ushlab turiladi.
  useEffect(() => {
    document.documentElement.setAttribute(UI_MODE_ATTRIBUTE, mode);
  }, [mode]);

  const setMode = useCallback((next: UiMode) => {
    setModeState(next);
    persistUiMode(next);
  }, []);

  const value = useMemo<UiModeState>(
    () => ({
      mode,
      ready,
      isModern: mode === "3d-modern",
      setMode,
      toggle: () => setMode(mode === "classic" ? "3d-modern" : "classic"),
    }),
    [mode, ready, setMode]
  );

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

/**
 * Rejimni o'qish/almashtirish. Provider'siz chaqirilsa ham yiqilmaydi -
 * standart (klassik) holat qaytadi, ya'ni bitta komponentni Provider'dan
 * tashqarida sinab ko'rish mumkin.
 */
export function useUiMode(): UiModeState {
  const context = useContext(UiModeContext);
  if (context) return context;

  return {
    mode: "classic",
    ready: false,
    isModern: false,
    setMode: () => {},
    toggle: () => {},
  };
}
