/**
 * KO'RINISH REJIMI (UI mode) — "Klassik" va "3D".
 *
 * Payme'dagi kabi: foydalanuvchi eski (klassik) va yangi (3D) dizayn
 * o'rtasida o'zi tanlaydi. Tanlov ikki joyda saqlanadi:
 *
 *   • `localStorage` — ASOSIY manba. Sahifa bo'yalishidan oldin
 *     ishlaydigan kichik skript (`UI_MODE_INIT_SCRIPT`) shuni o'qiydi,
 *     shuning uchun "klassik" tanlagan mijoz 3D interfeysning bir
 *     lahzalik ko'rinishini (flash) ko'rmaydi;
 *   • `cookie` — zaxira. DIQQAT: sayt Firebase Hosting rewrite orqali
 *     ochilganda backendga FAQAT `__session` cookie yetib boradi
 *     (CLAUDE.md dagi "Cookie qoidasi"), ya'ni server bu cookie'ga
 *     TAYANMAYDI. U to'g'ridan-to'g'ri Cloud Run manzilida va kelajakda
 *     SSR kerak bo'lganda asqotadi.
 *
 * Shu sababli SERVER har doim standart rejimni chizadi, brauzer esa
 * mount'dan keyin foydalanuvchi tanlovini qo'llaydi — hydration
 * mismatch bo'lmaydi.
 */

export type UiMode = "classic" | "3d-modern";

export const UI_MODES: readonly UiMode[] = ["classic", "3d-modern"] as const;

/**
 * Sayt birinchi ochilganda ko'rinadigan rejim.
 *
 * **Klassik** — ataylab: 3D ko'rinish hali sinovda, xarid oqimiga
 * aloqasi yo'q va telefonlarda og'ir. U admin sozlamasidan
 * (`SiteSettings.show3dMode`) yoqilgandagina mijozga ko'rinadi.
 */
export const DEFAULT_UI_MODE: UiMode = "classic";

/** localStorage kaliti (redux-persist'ning kalitidan alohida). */
export const UI_MODE_STORAGE_KEY = "atoyo.ui-mode";

/** Cookie nomi (zaxira; server unga tayanmaydi - yuqoridagi izohga qarang). */
export const UI_MODE_COOKIE = "atoyo_ui_mode";

/**
 * "BARIBIR YOQISH" bayrog'i.
 *
 * Qurilma sinovi 3D ni o'chirib qo'ysa (kam xotira, tejamkor rejim...)
 * foydalanuvchi uni MAJBURAN yoqishi mumkin. Tanlov shu kalitda
 * saqlanadi va faqat o'sha brauzerga tegishli.
 */
export const FORCE_3D_STORAGE_KEY = "atoyo.ui-3d-force";

/** `<html data-ui-mode="...">` - CSS shu atribut orqali rejimni biladi. */
export const UI_MODE_ATTRIBUTE = "data-ui-mode";

/** Cookie bir yil yashaydi - mijoz har safar qayta tanlamasin. */
const COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** Notanish qiymatni xavfsiz o'qish (localStorage/cookie ishonchsiz manba). */
export function parseUiMode(value: unknown): UiMode | null {
  return typeof value === "string" && UI_MODES.includes(value as UiMode)
    ? (value as UiMode)
    : null;
}

function cookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Saqlangan rejim (faqat brauzerda chaqiriladi). Hech narsa
 * saqlanmagan yoki o'qib bo'lmasa - standart rejim.
 */
export function readStoredUiMode(): UiMode {
  if (typeof window === "undefined") return DEFAULT_UI_MODE;
  try {
    return (
      parseUiMode(window.localStorage.getItem(UI_MODE_STORAGE_KEY)) ??
      parseUiMode(cookieValue(UI_MODE_COOKIE)) ??
      DEFAULT_UI_MODE
    );
  } catch {
    // Maxfiylik rejimida localStorage taqiqlangan bo'lishi mumkin.
    return DEFAULT_UI_MODE;
  }
}

/** Tanlovni ikkala joyga yozadi (biri ishlamasa ikkinchisi qoladi). */
export function persistUiMode(mode: UiMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode);
  } catch {
    /* localStorage yopiq - cookie yetadi */
  }
  try {
    document.cookie = `${UI_MODE_COOKIE}=${encodeURIComponent(mode)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  } catch {
    /* cookie yozib bo'lmadi - localStorage yetadi */
  }
}

/**
 * SAHIFA BO'YALISHIDAN OLDIN ishlaydigan skript (root layout'da).
 * Tema skripti bilan bir xil naqsh: `<html>` ga atribut qo'yadi,
 * shunda CSS 3D qatlamini darhol yashira oladi.
 */
export const UI_MODE_INIT_SCRIPT = `
try {
  var m = localStorage.getItem('${UI_MODE_STORAGE_KEY}');
  if (m !== 'classic' && m !== '3d-modern') {
    var c = document.cookie.match(/(?:^|; )${UI_MODE_COOKIE}=([^;]*)/);
    m = c ? decodeURIComponent(c[1]) : '${DEFAULT_UI_MODE}';
  }
  document.documentElement.setAttribute('${UI_MODE_ATTRIBUTE}', m === 'classic' ? 'classic' : '${DEFAULT_UI_MODE}');
} catch (e) {
  document.documentElement.setAttribute('${UI_MODE_ATTRIBUTE}', '${DEFAULT_UI_MODE}');
}
`;


/** "Baribir yoqish" belgilanganmi (faqat brauzerda). */
export function readForce3d(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FORCE_3D_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** "Baribir yoqish" holatini saqlaydi. */
export function persistForce3d(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(FORCE_3D_STORAGE_KEY, "1");
    else window.localStorage.removeItem(FORCE_3D_STORAGE_KEY);
  } catch {
    /* localStorage yopiq - majburiy rejim shu sessiyada ishlamaydi */
  }
}
