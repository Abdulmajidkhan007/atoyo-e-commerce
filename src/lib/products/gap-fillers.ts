/**
 * "BEPUL YETKAZISHGA X SO'M QOLDI" — FARQNI YOPADIGAN MAHSULOTLAR.
 *
 * Egasining g'oyasi: Instagram "reels" kabi mijozni ushlab qolish —
 * 4 000 so'mlik lipuchka olgan mijozga "yana 46 000 so'mlik qo'shsangiz
 * yetkazish bepul" deb, AYNAN shu farqni yopadigan mahsulotlarni
 * ko'rsatish. Shunda mijoz yetkazish uchun 15 000 to'lash o'rniga
 * foydali narsa sotib oladi, do'kon esa kichik buyurtmani taksi
 * puliga olib bormaydi.
 *
 * Tartiblash (sof funksiya, testi `gap-fillers.test.ts`):
 *   1. faqat BITTA qo'shish bilan farqni yopadiganlar (narxi ≥ farq);
 *   2. savatdagi kategoriyadan bo'lsa — yuqorida (mos keladi: kran
 *      olgan mijozga shlang, cho'tka olganga chelak);
 *   3. farqdan ko'p oshib ketmaganlar yuqorida (mijoz "keraksiz
 *      qimmat narsa tiqishtirildi" deb o'ylamasin);
 *   4. teng bo'lsa — arzonrog'i.
 * Zaxirasiz, rasmsiz va savatda turganlar chiqmaydi.
 */
export interface GapCandidate {
  id: string;
  category: string;
  /** Mijozga KO'RINADIGAN narx (dona/optom, chegirma hisobga olingan). */
  shownPrice: number;
  stock: number;
  hasImage: boolean;
}

/** "Farqdan ko'p oshmagan" chegarasi: farqning shuncha barobarigacha. */
const COMFORT_RATIO = 1.6;

export function rankGapFillers(
  candidates: GapCandidate[],
  options: { gap: number; cartCategories: string[]; exclude: string[] },
  limit = 8
): GapCandidate[] {
  const { gap } = options;
  if (!(gap > 0)) return [];
  const inCart = new Set(options.exclude);
  const cartCategories = new Set(options.cartCategories);

  const score = (item: GapCandidate) =>
    (cartCategories.has(item.category) ? 2 : 0) + (item.shownPrice <= gap * COMFORT_RATIO ? 1 : 0);

  return candidates
    .filter((item) => item.shownPrice >= gap && item.stock > 0 && item.hasImage && !inCart.has(item.id))
    .sort((a, b) => score(b) - score(a) || a.shownPrice - b.shownPrice)
    .slice(0, Math.max(0, limit));
}
