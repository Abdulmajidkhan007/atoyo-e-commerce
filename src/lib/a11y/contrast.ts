/**
 * RANG KONTRASTI (WCAG 2.1).
 *
 * Nega kodda: `docs/UI-SHISHA.md` §5 va `docs/QULAYLIK.md` matn/fon
 * nisbati kamida **4.5:1** bo'lishini talab qiladi. Talab qog'ozda
 * qolmasligi uchun palitra qiymatlari `contrast.test.ts` da shu
 * funksiya bilan o'lchanadi — rang o'zgartirilsa va kontrast tushib
 * ketsa, test YIQILADI.
 *
 * Bu modul faqat hisoblaydi: hech qayerda render qilinmaydi va
 * mijozga yuborilmaydi.
 */

/** WCAG darajalari. Katta matn - 18pt (yoki 14pt qalin) dan boshlab. */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
/** Matn bo'lmagan element (ikonka, fokus halqasi, chegara). */
export const WCAG_AA_NON_TEXT = 3;

export type Rgb = [number, number, number];

/** `#RRGGBB` yoki `#RGB` → [r, g, b]. */
export function parseHex(hex: string): Rgb {
  const clean = hex.trim().replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Rang HEX formatida emas: ${hex}`);
  }
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/** sRGB kanalini chiziqli (linear) qiymatga o'tkazish - WCAG formulasi. */
function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Nisbiy yorqinlik (0 - qora, 1 - oq). */
export function relativeLuminance([r, g, b]: Rgb): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/**
 * Ikki rang orasidagi kontrast nisbati (1:1 dan 21:1 gacha).
 * Tartib ahamiyatsiz - qaysi biri yorug'ligini funksiya o'zi topadi.
 */
export function contrastRatio(foreground: string | Rgb, background: string | Rgb): number {
  const fg = typeof foreground === "string" ? parseHex(foreground) : foreground;
  const bg = typeof background === "string" ? parseHex(background) : background;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Yarim shaffof rangni QATTIQ fon ustiga qo'yib, natijaviy rangni
 * beradi. Shisha (glass) qatlamlarini o'lchash uchun kerak: u yerda
 * matn ham, yuza ham alfa bilan beriladi.
 */
export function flatten(color: string | Rgb, alpha: number, over: string | Rgb): Rgb {
  const fg = typeof color === "string" ? parseHex(color) : color;
  const bg = typeof over === "string" ? parseHex(over) : over;
  return [0, 1, 2].map((i) => fg[i]! * alpha + bg[i]! * (1 - alpha)) as Rgb;
}
