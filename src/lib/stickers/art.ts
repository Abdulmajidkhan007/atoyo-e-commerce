/**
 * STIKER GRAFIKASI (vektor).
 *
 * Do'kon stikerlari uch qismdan iborat:
 *   1) yuqorida oltin CHIZIQLI IKONKA (qo'l siqish, quti, telefon...);
 *   2) o'rtada oq qalin YOZUV;
 *   3) pastda oq linza ichida ATOYO LOGOTIPI.
 *
 * `next/og` (satori) SVG ni `<img src="data:image/svg+xml;base64,...">`
 * ko'rinishida qabul qiladi, shuning uchun hammasi shu yerda SVG
 * matn sifatida yasaladi - tashqi rasm fayli kerak emas.
 */

export const GOLD = "#C49A6C";
export const NAVY_DARK = "#04202F";
export const WHITE = "#FFFFFF";

function dataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg.trim()).toString("base64")}`;
}

/**
 * LOGOTIP VEKTORLARI (viewBox 120x104).
 *
 * Alohida eksport qilingan, chunki ular ikki joyda ishlatiladi:
 * statik stikerda (`logoMark`, SVG matn sifatida) va animatsiyali
 * stikerda (`animate.ts`, Lottie egri chiziqlariga aylantiriladi).
 */
export const LOGO_VIEWBOX = { width: 120, height: 104 };
export const LOGO_LETTER_PATH =
  "M12 100 L44 20 C48 9 53 4 60 4 C67 4 72 9 76 20 L108 100 L84 100 L60 38 L36 100 Z";
export const LOGO_WAVE_PATHS = [
  "M4 70 C16 56 30 58 44 68 C58 78 70 78 84 66 L84 80 C70 92 56 92 42 82 C28 72 16 70 4 84 Z",
  "M6 88 C18 76 30 78 42 86 C50 91 58 92 66 89 L66 99 C56 103 46 101 38 96 C28 90 18 89 6 100 Z",
];

/**
 * ATOYO LOGOTIPI: "Λ" shaklidagi qalin harf va uni kesib o'tuvchi
 * ikkita oltin to'lqin (do'kon logotipidagi kabi).
 */
export function logoMark(variant: "light" | "dark" = "light"): string {
  const letter = variant === "light" ? WHITE : NAVY_DARK;
  return dataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 104" width="120" height="104">
  <path fill="${letter}" d="${LOGO_LETTER_PATH}"/>
  ${LOGO_WAVE_PATHS.map((d) => `<path fill="${GOLD}" d="${d}"/>`).join("\n  ")}
</svg>`);
}

/**
 * YUQORIDAGI IKONKA - oltin, ingichka chiziqli (do'kon stikerlaridagi
 * uslub). Har biri 100x100 maydonda chiziladi.
 */
const ICON_PATHS: Record<string, string> = {
  // Yulduz (mashhur / tavsiya)
  star: `
    <path d="M50 16 L61 40 L87 43 L68 61 L73 87 L50 74 L27 87 L32 61 L13 43 L39 40 Z" />`,
  // Sovg'a (aksiya / bonus)
  gift: `
    <path d="M16 44 L84 44 L84 84 L16 84 Z" />
    <path d="M12 30 L88 30 L88 44 L12 44 Z" />
    <path d="M50 30 L50 84" />
    <path d="M50 30 C42 30 34 26 34 20 C34 15 38 12 43 14 C48 16 50 24 50 30 Z" />
    <path d="M50 30 C58 30 66 26 66 20 C66 15 62 12 57 14 C52 16 50 24 50 30 Z" />`,
  // Savol belgisi (doira ichida)
  question: `
    <circle cx="50" cy="50" r="34" />
    <path d="M40 40 C40 32 46 28 51 28 C58 28 62 33 62 39 C62 47 52 48 52 56" />
    <path d="M52 66 L52 68" />`,
  // Belgi (tasdiq)
  check: `
    <circle cx="50" cy="50" r="34" />
    <path d="M34 51 L45 62 L67 39" />`,
  // Quti (buyurtma / qadoq)
  box: `
    <path d="M18 36 L50 22 L82 36 L82 68 L50 82 L18 68 Z" />
    <path d="M18 36 L50 50 L82 36" />
    <path d="M50 50 L50 82" />`,
  // Telefon
  phone: `
    <path d="M28 20 L40 20 L46 38 L38 44 C42 54 50 62 60 66 L66 58 L84 64 L84 76
             C84 80 80 84 76 84 C46 82 22 58 20 28 C20 24 24 20 28 20 Z" />`,
  // Yetkazib berish (yuk mashinasi)
  truck: `
    <path d="M10 30 L58 30 L58 66 L10 66 Z" />
    <path d="M58 42 L76 42 L88 54 L88 66 L58 66" />
    <circle cx="28" cy="72" r="8" />
    <circle cx="74" cy="72" r="8" />`,
  // Yengil mashina (yo'l bo'lsin)
  car: `
    <path d="M14 62 L14 50 L26 34 L74 34 L86 50 L86 62" />
    <path d="M14 62 L86 62" />
    <circle cx="30" cy="66" r="8" />
    <circle cx="70" cy="66" r="8" />`,
  // Masjid (bayram, juma)
  mosque: `
    <path d="M50 12 L50 22" />
    <path d="M36 46 C36 32 42 24 50 22 C58 24 64 32 64 46" />
    <path d="M18 84 L18 50 M82 84 L82 50" />
    <path d="M14 84 L86 84" />
    <path d="M28 84 L28 56 C28 50 34 46 40 46 L60 46 C66 46 72 50 72 56 L72 84" />`,
  // Yurak (rahmat / xayrixohlik)
  heart: `
    <path d="M50 80 C20 60 14 44 22 34 C30 24 44 26 50 38 C56 26 70 24 78 34
             C86 44 80 60 50 80 Z" />`,
  // Soat (ish vaqti / kutish)
  clock: `
    <circle cx="50" cy="50" r="34" />
    <path d="M50 30 L50 52 L64 60" />`,
  // Kalit (usta / xizmat)
  wrench: `
    <path d="M66 20 C56 20 48 28 48 38 C48 41 49 44 50 46 L20 76 L28 84 L58 54
             C60 55 63 56 66 56 C76 56 84 48 84 38 C84 34 83 31 81 28 L70 39 L63 32 L74 21
             C71 20 69 20 66 20 Z" />`,
  // Tomchi (suv / santexnika)
  droplet: `
    <path d="M50 14 C50 14 26 44 26 58 C26 72 37 82 50 82 C63 82 74 72 74 58
             C74 44 50 14 50 14 Z" />`,
  // Chegirma yorlig'i
  tag: `
    <path d="M52 14 L86 14 L86 48 L48 86 L14 52 Z" />
    <circle cx="72" cy="28" r="6" />`,
  // Karnay (aksiya / e'lon)
  megaphone: `
    <path d="M20 40 L20 60 L36 60 L64 78 L64 22 L36 40 Z" />
    <path d="M74 38 C80 44 80 56 74 62" />
    <path d="M28 60 L32 82 L44 82 L40 66" />`,
};

export { STICKER_ICONS, STICKER_ICON_LABELS } from "./icons";

/**
 * Ikonkaning XOM SVG bo'lagi (`<path>` / `<circle>` teglari, 100x100
 * maydonda). Animatsiya moduli shu bo'lakni o'qib Lottie shakllariga
 * aylantiradi - ikonkalar ikki marta chizilmasin.
 */
export function iconFragment(name: string): string | null {
  return ICON_PATHS[name] ?? null;
}

/** Oltin chiziqli ikonka (SVG data URI). */
export function iconArt(name: string, color = GOLD): string | null {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  return dataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <g fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    ${paths}
  </g>
</svg>`);
}
