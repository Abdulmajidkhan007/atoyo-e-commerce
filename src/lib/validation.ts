/**
 * Umumiy kiritma validatsiyasi - CLIENT (formada yubormasdan oldin) va
 * SERVER (API'da, hal qiluvchi tekshiruv) ikkalasida ishlatiladi.
 * "server-only" ATAYLAB yo'q.
 */

/**
 * O'zbekiston telefon raqamini normallashtiradi.
 * Qabul qilinadi: "+998 90 123-45-67", "998901234567", "901234567".
 * Natija: "+998901234567" yoki noto'g'ri bo'lsa null (harflar, kam/ortiq
 * raqam va h.k.).
 */
export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(cleaned)) return null;

  const digits = cleaned.replace(/^\+/, "");
  if (/^998\d{9}$/.test(digits)) return `+${digits}`;
  if (/^\d{9}$/.test(digits)) return `+998${digits}`;
  return null;
}

/**
 * Ism-familiya haqiqiy matnga o'xshashini tekshiradi: kamida 2 ta harf,
 * uzunligi 2-120, faqat raqam/belgilardan iborat emas.
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 120) return false;
  const letterCount = trimmed.match(/\p{L}/gu)?.length ?? 0;
  return letterCount >= 2;
}
