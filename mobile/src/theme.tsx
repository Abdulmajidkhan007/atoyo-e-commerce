import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {StyleSheet, useColorScheme, type ColorSchemeName} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * TEMA. Palitra logotipdan olingan va saytdagi `tailwind.config.ts`
 * bilan bir xil qiymatlarda: navy (fon/matn), aqua = qumli-oltin urg'u.
 * Sayt `darkMode: "class"` bilan ishlaydi - ilovada ham xuddi shunday
 * uch holat bor: "light" | "dark" | "system".
 */

export interface Palette {
  /** Sahifa foni */
  bg: string;
  /** Kartochka/panel foni */
  surface: string;
  /** Ikkinchi darajali fon (rasm joyi, input) */
  surfaceAlt: string;
  /** Asosiy matn */
  text: string;
  /** Ikkinchi darajali matn */
  muted: string;
  border: string;
  /** Urg'u (tugma, aktiv tab) */
  accent: string;
  /** Urg'u ustidagi matn */
  onAccent: string;
  accentSoft: string;
  /** Header va pastki menyu foni (saytdagi kabi) */
  chrome: string;
  /** Brend banneri foni - ikki temada ham navy */
  brand: string;
  onBrand: string;
  onBrandMuted: string;
  danger: string;
  success: string;
  white: string;
}

const NAVY = '#072D40';
const NAVY_DARK = '#04202F';
const NAVY_700 = '#0B3B54';
const NAVY_500 = '#175071';
const NAVY_300 = '#5E8CA6';
const NAVY_100 = '#C9DCE6';
const NAVY_50 = '#EDF4F8';
const GOLD = '#C49A6C';
const GOLD_DARK = '#8A6640';
const GOLD_300 = '#DCC09A';
const GOLD_100 = '#F0E1CC';

export const lightPalette: Palette = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: NAVY_50,
  text: NAVY,
  muted: NAVY_300,
  border: NAVY_100,
  accent: GOLD,
  onAccent: NAVY,
  accentSoft: GOLD_100,
  chrome: '#FFFFFF',
  brand: NAVY,
  onBrand: '#FFFFFF',
  onBrandMuted: '#9FC0D2',
  danger: '#D64545',
  success: '#2E7D5B',
  white: '#FFFFFF',
};

export const darkPalette: Palette = {
  bg: NAVY_DARK,
  surface: NAVY_700,
  surfaceAlt: NAVY,
  text: '#FFFFFF',
  muted: NAVY_100,
  border: NAVY_500,
  accent: GOLD_300,
  onAccent: NAVY_DARK,
  accentSoft: GOLD_DARK,
  chrome: NAVY,
  brand: NAVY,
  onBrand: '#FFFFFF',
  onBrandMuted: '#9FC0D2',
  danger: '#FF8A80',
  success: '#7BD1A8',
  white: '#FFFFFF',
};

/** Eski nomlar bilan mos ranglar - tema tanlamaydigan joylar uchun. */
export const colors = {
  navy: NAVY,
  navyDark: NAVY_DARK,
  navyLight: NAVY_700,
  gold: GOLD,
  goldDark: GOLD_DARK,
  goldTint: GOLD_100,
  white: '#FFFFFF',
} as const;

export const spacing = {xs: 4, sm: 8, md: 12, lg: 16, xl: 24} as const;
export const radius = {sm: 8, md: 12, lg: 20} as const;

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeValue {
  /** Tanlangan rejim (sozlamalarda ko'rsatiladi). */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  palette: Palette;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = 'atoyo:theme';

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const system: ColorSchemeName = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return {
      mode,
      isDark,
      palette: isDark ? darkPalette : lightPalette,
      setMode: next => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
    };
  }, [mode, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme ThemeProvider ichida ishlatilishi kerak.');
  return context;
}

/**
 * Stil "fabrikasi": StyleSheet palitraga bog'liq bo'lgani uchun modul
 * darajasida yaratib bo'lmaydi. Bu hook har palitra uchun bir marta
 * hisoblab, keshlab beradi.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (c: Palette) => T,
): () => T & {c: Palette} {
  const cache = new Map<Palette, T & {c: Palette}>();
  return function useStyles() {
    const {palette} = useTheme();
    const cached = cache.get(palette);
    if (cached) return cached;
    const created = Object.assign(StyleSheet.create(factory(palette)), {c: palette});
    cache.set(palette, created);
    return created;
  };
}
