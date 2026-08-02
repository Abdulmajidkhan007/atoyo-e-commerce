/**
 * QIDIRUV YORDAMCHILARI - saytdagi `src/lib/search/tokens.ts` bilan
 * bir xil qoida (ikkalasi bitta Firestore indeksidan foydalanadi).
 *
 * Mahsulot "Душ", "Dush" yoki "Duş" deb yozilgan bo'lishi mumkin,
 * apostrof esa besh xil belgi bilan. Shu sabab qidiruv so'zi ikki
 * ko'rinishda yuboriladi: asl holida va "tekislangan" holida.
 */

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

export function normalizeSearchWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/['ʼʻ‘’`´]/g, '')
    .replace(/[şŞ]/g, 'sh')
    .replace(/[çÇ]/g, 'ch')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .replace(/[а-яёўқғҳ]/g, ch => CYRILLIC[ch] ?? ch)
    .replace(/\s+/g, '');
}

/** Firestore `array-contains-any` uchun so'z ro'yxati. */
export function searchTermVariants(term: string, max = 12): string[] {
  const words = term
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length >= 2);

  const variants = new Set<string>();
  for (const word of words.length > 0 ? words : [term.trim().toLowerCase()]) {
    if (!word) continue;
    variants.add(word);
    const normalized = normalizeSearchWord(word);
    if (normalized.length >= 2) variants.add(normalized);
  }
  return Array.from(variants).slice(0, max);
}

/**
 * Hamma so'z mahsulotda bormi (tartibi muhim emas): "8276 dush" ham,
 * "dush 8276" ham "Boou dush 8276" ni topadi.
 */
export function matchesAllWords(haystack: string, term: string): boolean {
  const flat = normalizeSearchWord(haystack);
  return term
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(word => flat.includes(normalizeSearchWord(word)));
}
