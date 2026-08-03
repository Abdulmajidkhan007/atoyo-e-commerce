/**
 * YORDAMCHI HIMOYASI (guardrail).
 *
 * Yordamchi FAQAT shu do'kon haqida gapiradi. Ikki qatlam:
 *  1) shu fayldagi tekshiruvlar - modelga umuman bormaydigan so'rovlar
 *     (prompt injection, "sen endi boshqa botsan", kod yozdirish,
 *     tizim ko'rsatmasini so'rash). Bu ham xavfsizlik, ham tejamkorlik;
 *  2) `system-prompt.ts` dagi qat'iy ko'rsatma - modelning o'zi
 *     mavzudan chetga chiqmaydi.
 *
 * Client ham (tez javob uchun) server ham ishlatadi - "server-only" YO'Q.
 */

/** Foydalanuvchi xabari uchun cheklovlar. */
export const MAX_QUESTION_LENGTH = 600;
export const MAX_HISTORY_MESSAGES = 8;

/**
 * Ko'rsatmani buzishga urinish naqshlari (uz/ru/en). Aylanma yo'llar ham:
 * "roleplay", "DAN", "developer mode", "system prompt", "ignore rules",
 * "tarjima qil", "she'r yoz" kabi mavzudan chiqarish urinishlari.
 */
const JAILBREAK_PATTERNS: RegExp[] = [
  // Ko'rsatmani almashtirish / oshkor qilish
  /\b(ignore|disregard|forget|override)\b[^.]{0,40}\b(previous|prior|above|earlier|all)\b[^.]{0,20}\b(instruction|prompt|rule|message)/i,
  /\b(system|developer)\s*(prompt|message|instruction)/i,
  /(oldingi|avvalgi|yuqoridagi)\s+(ko'rsatma|korsatma|qoida|buyruq)/i,
  /(ko'rsatma|korsatma|qoida)(lar)?(ingni|ingizni|ni)?\s+(unut|bekor|buz|ko'rsat|korsat|ayt)/i,
  /(забудь|игнорируй|проигнорируй)\s+(все\s+)?(предыдущ|инструкц|правил)/i,
  /(системн\w*|исходн\w*)\s+(промпт|инструкц)/i,
  // Rolni almashtirish
  /\b(you are|act as|pretend to be|roleplay as|from now on you)\b/i,
  /\b(dan mode|developer mode|jailbreak|do anything now)\b/i,
  /(sen\s+endi|bundan\s+buyon\s+sen)\s+\w+/i,
  /(ты\s+теперь|представь,?\s*что\s+ты)\s+\w+/i,
  // Vazifadan tashqari ish qildirish
  /\b(write|generate|debug|fix)\b[^.]{0,20}\b(code|script|program|sql|python|javascript)\b/i,
  /(kod|skript|dastur)\s+(yoz|yoza|tuz|generatsiya)/i,
  /(напиши|сгенерируй)\s+(код|скрипт|программ)/i,
  /\b(essay|poem|story|homework|recipe)\b[^.]{0,30}\b(write|about)\b/i,
  /(she'r|sher|insho|hikoya|referat|uy\s*vazifa)\s*(yoz|tuz)/i,
];

/** Do'kon bilan aloqasi yo'q, lekin "zararsiz" ko'rinadigan mavzular. */
const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(weather|football|politics|president|bitcoin|crypto|horoscope)\b/i,
  /(ob-havo|siyosat|prezident|futbol|bitkoin|kripto|namoz\s*vaqti|munajjim)/i,
  /(погод|политик|президент|футбол|биткоин|крипт|гороскоп)/i,
];

export type GuardVerdict =
  | { ok: true }
  | { ok: false; reason: "empty" | "too_long" | "jailbreak" | "off_topic" };

/** Modelga yuborishdan oldingi tekshiruv. */
export function checkQuestion(raw: string): GuardVerdict {
  const text = raw.trim();
  if (text.length < 2) return { ok: false, reason: "empty" };
  if (text.length > MAX_QUESTION_LENGTH) return { ok: false, reason: "too_long" };

  for (const pattern of JAILBREAK_PATTERNS) {
    if (pattern.test(text)) return { ok: false, reason: "jailbreak" };
  }
  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(text)) return { ok: false, reason: "off_topic" };
  }
  return { ok: true };
}

/** Rad javoblari - mijozga chiroyli ko'rinishda. */
export const REFUSAL_TEXT: Record<Exclude<GuardVerdict, { ok: true }>["reason"], string> = {
  empty: "Savolingizni yozib yuboring — mahsulot, narx, yetkazib berish yoki buyurtma bo'yicha yordam beraman.",
  too_long: "Savolingiz juda uzun. Iltimos, qisqaroq (600 belgigacha) yozing.",
  jailbreak:
    "Men faqat Atoyo Santexnika do'koni bo'yicha yordam beraman: mahsulotlar, narxlar, zaxira, yetkazib berish va buyurtma. Boshqa vazifalarni bajara olmayman.",
  off_topic:
    "Bu savol do'kon mavzusidan tashqarida. Men mahsulotlar, narxlar, yetkazib berish va buyurtma bo'yicha yordam bera olaman.",
};

/**
 * Model javobini oxirgi marta tekshiradi. Model qandaydir yo'l bilan
 * ko'rsatmani takrorlab yuborsa yoki mavzudan chiqib ketsa - javob
 * o'rniga standart rad javobi ketadi.
 */
export function sanitizeAnswer(answer: string): string {
  const leaked = /(system\s*prompt|мой\s*промпт|mening\s*ko'rsatmam|<shop_context>|<qoidalar>)/i.test(answer);
  if (leaked) return REFUSAL_TEXT.jailbreak;
  return answer.trim().slice(0, 4000);
}
