/**
 * NARX VA SANA FORMATLASH — bitta joyda.
 *
 * Avval `formatSom()` yigirmadan ortiq faylga ko'chirib yozilgan edi
 * (ba'zi joyda `som()`, ba'zi joyda `formatPrice()` nomi bilan) va
 * nusxalar bir-biridan farq qila boshlagan: biri yaxlitlardi, biri
 * yo'q; biri ajratgich sifatida oddiy bo'sh joy qo'yardi, biri —
 * uzilmas bo'sh joy. Endi hamma joy shu fayldan chaqiradi.
 *
 * IKKI QOIDA:
 *
 * 1. `toLocaleString` ISHLATILMAYDI. U ICU ma'lumotiga bog'liq:
 *    serverdagi Node va brauzerdagi natija farq qilsa React
 *    "hydration mismatch" beradi. Guruhlash qo'lda qilinadi.
 *
 * 2. Sana HAR DOIM Toshkent vaqtida. Server Cloud Run'da UTC'da
 *    ishlaydi — `getHours()` ni to'g'ridan-to'g'ri ishlatsak, serverda
 *    chizilgan chek 14:30 o'rniga 09:30 ko'rsatardi. O'zbekistonda
 *    yozgi vaqt yo'q, shuning uchun doimiy +5 soat yetarli.
 */

/** Uzilmas bo'sh joy — "1 234 567" qatorlar orasida bo'linib ketmasin. */
const NBSP = "\u00A0";

/** Toshkent vaqti — UTC+5, yozgi vaqt yo'q. */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

const EMPTY = "—";

/** 1234567 → "1 234 567" (uzilmas bo'sh joy bilan). */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value);
  const negative = rounded < 0;
  const digits = String(Math.abs(rounded));

  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += NBSP;
    out += digits[i];
  }
  return negative ? `-${out}` : out;
}

/** 1234567 → "1 234 567 so'm". */
export function formatSom(amount: number): string {
  return `${formatNumber(amount)} so'm`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Toshkent vaqtidagi kun/oy/yil/soat/daqiqa. */
function tashkentParts(ms: number) {
  const d = new Date(ms + TASHKENT_OFFSET_MS);
  return {
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    year: d.getUTCFullYear(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** "08.02.2026". Sana yo'q bo'lsa — "—". */
export function formatDate(ms?: number | null): string {
  if (!ms || !Number.isFinite(ms)) return EMPTY;
  const p = tashkentParts(ms);
  return `${pad(p.day)}.${pad(p.month)}.${p.year}`;
}

/** "08.02.2026 14:30". Sana yo'q bo'lsa — "—". */
export function formatDateTime(ms?: number | null): string {
  if (!ms || !Number.isFinite(ms)) return EMPTY;
  const p = tashkentParts(ms);
  return `${formatDate(ms)} ${pad(p.hour)}:${pad(p.minute)}`;
}
