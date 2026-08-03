import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {
  PixelRatio,
  StyleSheet,
  useColorScheme,
  useWindowDimensions,
  type ColorSchemeName,
} from 'react-native';
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

/**
 * SHRIFT O'LCHAMI.
 *
 * Telefon sozlamasida shrift kattalashtirilgan bo'lsa Android matnni
 * o'zi kattalashtiradi va tugmalar/menyu yozuvlari sig'may qoladi
 * ("Katalog" -> "Kat", "Sevimlilar" -> "Se"). Shuning uchun ilova
 * o'lchamni O'ZI boshqaradi: `makeStyles` dagi barcha `fontSize`
 * qiymatlari shu koeffitsiyentga ko'paytiriladi va tizim
 * kattalashtirishi neytrallanadi (ikki marta kattalashmaydi).
 *
 * "Tizim bo'yicha" rejimida telefon sozlamasi hurmat qilinadi, lekin
 * maket buzilmasligi uchun 1.3 dan oshirilmaydi.
 */
export type FontScaleMode = 'system' | 'small' | 'normal' | 'large' | 'xlarge';

const FIXED_SCALES: Record<Exclude<FontScaleMode, 'system'>, number> = {
  small: 0.9,
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

/** Tizim kattalashtirishining yuqori chegarasi. */
const MAX_SYSTEM_SCALE = 1.3;
const MIN_SYSTEM_SCALE = 0.85;

interface ThemeValue {
  /** Tanlangan rejim (sozlamalarda ko'rsatiladi). */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  palette: Palette;
  /** Sozlamalarda tanlangan shrift o'lchami. */
  fontScaleMode: FontScaleMode;
  setFontScaleMode: (mode: FontScaleMode) => void;
  /**
   * Stillardagi `fontSize` shu songa ko'paytiriladi. Tizim
   * kattalashtirishi allaqachon hisobga olingan - qo'shimcha
   * hisob-kitob kerak emas.
   */
  fontFactor: number;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = 'atoyo:theme';
const FONT_KEY = 'atoyo:fontScale';

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const system: ColorSchemeName = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [fontScaleMode, setFontScaleModeState] = useState<FontScaleMode>('system');

  // Telefon sozlamasidagi shrift koeffitsiyenti (1 = standart).
  const {fontScale: deviceScale} = useWindowDimensions();

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, FONT_KEY])
      .then(pairs => {
        const saved = Object.fromEntries(pairs) as Record<string, string | null>;
        const theme = saved[STORAGE_KEY];
        if (theme === 'light' || theme === 'dark' || theme === 'system') setModeState(theme);

        const font = saved[FONT_KEY];
        if (font && (font === 'system' || font in FIXED_SCALES)) {
          setFontScaleModeState(font as FontScaleMode);
        }
      })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';

    // Tizim matnni o'zi ham kattalashtiradi, shuning uchun kerakli
    // o'lchamni tizim koeffitsiyentiga BO'LAMIZ - natijada ekranda
    // aynan biz istagan o'lcham chiqadi.
    const device = deviceScale > 0 ? deviceScale : 1;
    const target =
      fontScaleMode === 'system'
        ? Math.min(Math.max(device, MIN_SYSTEM_SCALE), MAX_SYSTEM_SCALE)
        : FIXED_SCALES[fontScaleMode];

    return {
      mode,
      isDark,
      palette: isDark ? darkPalette : lightPalette,
      setMode: next => {
        setModeState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      },
      fontScaleMode,
      setFontScaleMode: next => {
        setFontScaleModeState(next);
        AsyncStorage.setItem(FONT_KEY, next).catch(() => {});
      },
      fontFactor: target / device,
    };
  }, [mode, system, fontScaleMode, deviceScale]);

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
  // Kesh kaliti: palitra + shrift koeffitsiyenti.
  const cache = new Map<Palette, Map<number, T & {c: Palette}>>();

  return function useStyles() {
    const {palette, fontFactor} = useTheme();
    const key = Math.round(fontFactor * 100) / 100;

    let byFont = cache.get(palette);
    if (!byFont) {
      byFont = new Map();
      cache.set(palette, byFont);
    }
    const cached = byFont.get(key);
    if (cached) return cached;

    const created = Object.assign(StyleSheet.create(scaleFonts(factory(palette), key)), {
      c: palette,
    });
    byFont.set(key, created);
    return created;
  };
}

/** Stildagi `fontSize` va `lineHeight` ni koeffitsiyentga ko'paytiradi. */
function scaleFonts<T extends StyleSheet.NamedStyles<T>>(styles: T, factor: number): T {
  if (factor === 1) return styles;

  const result: Record<string, unknown> = {};
  const source = styles as unknown as Record<string, Record<string, unknown>>;
  for (const [name, style] of Object.entries(source)) {
    const next: Record<string, unknown> = {...style};
    if (typeof next.fontSize === 'number') {
      next.fontSize = PixelRatio.roundToNearestPixel(next.fontSize * factor);
    }
    if (typeof next.lineHeight === 'number') {
      next.lineHeight = PixelRatio.roundToNearestPixel(next.lineHeight * factor);
    }
    result[name] = next;
  }
  return result as unknown as T;
}

/** makeStyles'dan tashqarida yozilgan o'lchamlar uchun (masalan navigatsiya). */
export function useFontSize(size: number): number {
  const {fontFactor} = useTheme();
  return PixelRatio.roundToNearestPixel(size * fontFactor);
}
