/**
 * TAVSIFNI OMMAVIY KO'RINISHGA TAYYORLASH.
 *
 * 1C narxnomasidan import qilinganda tavsifga xizmat ma'lumoti ham
 * tushgan: "1C kodi: 5967. Qadoqda: 6 dona". Ichki kod mijozga
 * kerak emas va e'lonlarda ko'rinmasligi kerak - u faqat xodimlar
 * uchun (admin panelda tavsifning o'zi to'liq ko'rinadi).
 *
 * Shuning uchun kanal posti va ijtimoiy tarmoq matni shu funksiyadan
 * o'tadi. Qolgan foydali qismlar ("Qadoqda: 6 dona") joyida qoladi.
 *
 * Client ham, server ham ishlatishi mumkin - "server-only" YO'Q.
 */

/**
 * Olib tashlanadigan xizmat qatorlari. Kirillcha "С"/"с" ham hisobga
 * olingan: 1C kodi ba'zi fayllarda "1С" (kirill) bo'lib tushadi.
 */
const INTERNAL_PATTERNS: RegExp[] = [
  // "1C kodi: 5967", "1С код: 5967", "1c kod - 5967"
  // ("kod" so'zi lotin ham, kirill ham bo'lishi mumkin.)
  /(^|[.;\n])[^\S\n]*1\s*[cCсС]\s*[kк][oо][dд][a-zA-Zа-яА-Я]{0,2}\s*[:\-–]\s*[^.\n;]*/gi,
];

/** E'lonlarda ko'rsatiladigan tavsif (ichki kodlarsiz). */
export function publicDescription(text: string | null | undefined): string {
  if (!text) return "";

  let out = text;
  for (const pattern of INTERNAL_PATTERNS) {
    out = out.replace(pattern, (_match, before: string | undefined) => before ?? "");
  }

  return out
    // Qatorlar olib tashlangach qolgan ortiqcha tinish belgilari.
    .replace(/\.\s*\./g, ".")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[\s.;,–-]+/, "")
    .replace(/[\s;,]+$/, "")
    .trim();
}
