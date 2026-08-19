"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_UI_MODE,
  UI_MODE_ATTRIBUTE,
  persistForce3d,
  persistUiMode,
  readForce3d,
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
  /**
   * "BARIBIR YOQISH": qurilma sinovi 3D ni rad etgan bo'lsa ham
   * foydalanuvchi uni majburan yoqqan.
   *
   * MUHIM: bu holat AYNAN SHU YERDA (kontekstda) turadi. Ilgari u
   * `useImmersive` ichidagi oddiy `useState` edi va har komponent
   * o'z nusxasini ko'rardi: tugma o'zida yoqilardi, sahna esa
   * bundan bexabar qolardi - tugma "ishlamas" edi.
   */
  force3d: boolean;
  setForce3d: (value: boolean) => void;
}

const UiModeContext = createContext<UiModeState | null>(null);

export function UiModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UiMode>(DEFAULT_UI_MODE);
  const [ready, setReady] = useState(false);
  const [force3d, setForce3dState] = useState(false);

  // Saqlangan tanlov - faqat brauzerda, mount'dan keyin.
  useEffect(() => {
    const stored = readStoredUiMode();
    const storedForce = readForce3d();
    // Mikrovazifada: effekt ichida to'g'ridan-to'g'ri setState chaqirish
    // React compiler qoidasini buzadi va ortiqcha render beradi.
    const timer = setTimeout(() => {
      setModeState(stored);
      setForce3dState(storedForce);
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

  const setForce3d = useCallback((value: boolean) => {
    setForce3dState(value);
    persistForce3d(value);
  }, []);

  const value = useMemo<UiModeState>(
    () => ({
      mode,
      ready,
      isModern: mode === "3d-modern",
      setMode,
      toggle: () => setMode(mode === "classic" ? "3d-modern" : "classic"),
      force3d,
      setForce3d,
    }),
    [mode, ready, setMode, force3d, setForce3d]
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
    force3d: false,
    setForce3d: () => {},
  };
}
