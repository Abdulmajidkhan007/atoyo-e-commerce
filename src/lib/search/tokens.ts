/**
 * Mahsulot nomi (va brendi) dan qidiruv tokenlari yasaydi. Prefiks-qidiruv
 * (nameSearchIndex) faqat nom BOSHIdan mos kelganda ishlaydi; tokenlar esa
 * "kran" deb qidirganda "Sharli kran 1/2" ni ham topish imkonini beradi
 * (Firestore `array-contains` so'rovi bilan).
 *
 * Client ham, server ham ishlatadi - shuning uchun "server-only" YO'Q.
 */

/** Kirill -> lotin (o'zbekcha va ruscha harflar). */
const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya",
  ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/**
 * QIDIRUV UCHUN BIR XIL KO'RINISH.
 *
 * Bir mahsulot "Душ", "Dush" yoki "Duş" deb yozilishi mumkin; o'zbekcha
 * apostrof esa besh xil belgi bilan yoziladi (o', oʻ, o‘, oʼ). Shu
 * funksiya hammasini bitta ko'rinishga keltiradi - shunda kirillcha
 * yozib qidirgan odam lotincha nomni ham topadi.
 */
export function normalizeSearchWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/['ʼʻ‘’`´]/g, "")
    .replace(/[şŞ]/g, "sh")
    .replace(/[çÇ]/g, "ch")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[а-яёўқғҳ]/g, (ch) => CYRILLIC[ch] ?? ch)
    .replace(/\s+/g, "");
}

export function buildNameTokens(name: string, brand?: string, sku?: string): string[] {
  // Kod (artikul) ham tokenlarga tushadi - "HS897" deb qidirilsa topiladi.
  const source = `${name} ${brand ?? ""} ${sku ?? ""}`.toLowerCase();
  const words = source
    .split(/[^a-zA-Z0-9а-яА-ЯёЁўЎқҚғҒҳҲ'ʼ/.-]+/u)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  // Har bir so'z ikki ko'rinishda saqlanadi: asl holida va "tekislangan"
  // holida - shunda kirillcha ham, lotincha ham qidiruv ishlaydi.
  const tokens = new Set<string>();
  for (const word of words) {
    tokens.add(word);
    const normalized = normalizeSearchWord(word);
    if (normalized.length >= 2) tokens.add(normalized);
  }
  return Array.from(tokens).slice(0, 40);
}

/**
 * Qidiruv so'rovini Firestore `array-contains-any` uchun so'zlarga
 * ajratadi (asl + tekislangan ko'rinish). Firestore bir so'rovda 30 tagacha
 * qiymatga ruxsat beradi - biz 12 tasi bilan cheklanamiz.
 */
export function searchTermVariants(term: string, max = 12): string[] {
  const words = term
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 2);

  const variants = new Set<string>();
  for (const word of words.length > 0 ? words : [term.trim().toLowerCase()]) {
    if (!word) continue;
    variants.add(word);
    const normalized = normalizeSearchWord(word);
    if (normalized.length >= 2) variants.add(normalized);
  }
  return Array.from(variants).slice(0, max);
}
