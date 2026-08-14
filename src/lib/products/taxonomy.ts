/**
 * KATEGORIYA / MATERIAL / SOTISH TURI ro'yxatlari (umumiy qism).
 *
 * Bu fayl client komponentlarda ham ishlatiladi, shuning uchun unda
 * server kutubxonalari (firebase-admin) BO'LMASLIGI kerak - Firestore'dan
 * o'qish `taxonomy-server.ts` da.
 *
 * Standart qiymatlar kodda turadi (sayt, bot va ilova ularni biladi),
 * admin esa panel orqali YANGILARINI qo'sha oladi - ular Firestore'ning
 * `metadata/taxonomy` hujjatida saqlanadi va shu yerda birlashtiriladi.
 *
 * Shu sababli `Product.category` / `material` / `unit` endi qat'iy union
 * emas, oddiy matn (slug): yangi tur qo'shish uchun kodga tegish shart emas.
 */

export interface TaxonomyItem {
  slug: string;
  label: string;
}

export const BUILTIN_CATEGORIES: TaxonomyItem[] = [
  { slug: "pipes", label: "Quvurlar" },
  { slug: "fittings", label: "Muftalar" },
  { slug: "faucets", label: "Kranlar" },
  { slug: "shower-systems", label: "Dush tizimlari" },
  { slug: "boilers", label: "Isitish qozonlari" },
  { slug: "radiators", label: "Radiatorlar" },
  { slug: "pumps", label: "Nasoslar" },
  { slug: "sanitary-ware", label: "Santexnika buyumlari" },
];

export const BUILTIN_MATERIALS: TaxonomyItem[] = [
  { slug: "polypropylene", label: "Polipropilen" },
  { slug: "metal-plastic", label: "Metalloplastik" },
  { slug: "steel", label: "Po'lat" },
  { slug: "copper", label: "Mis" },
  { slug: "brass", label: "Latun" },
  { slug: "cast-iron", label: "Cho'yan" },
  { slug: "pvc", label: "PVX" },
];

/** Sotish turi - mahsulot nima bilan o'lchanadi va sotiladi. */
export const BUILTIN_UNITS: TaxonomyItem[] = [
  { slug: "dona", label: "dona" },
  { slug: "metr", label: "metr" },
  { slug: "kg", label: "kg" },
  { slug: "litr", label: "litr" },
  { slug: "m2", label: "m²" },
  { slug: "quti", label: "quti" },
  { slug: "rulon", label: "rulon" },
  { slug: "komplekt", label: "komplekt" },
];

export const DEFAULT_UNIT = "dona";

export type TaxonomyKind = "categories" | "materials" | "units";

export interface Taxonomy {
  categories: TaxonomyItem[];
  materials: TaxonomyItem[];
  units: TaxonomyItem[];
}

export const BUILTIN_TAXONOMY: Taxonomy = {
  categories: BUILTIN_CATEGORIES,
  materials: BUILTIN_MATERIALS,
  units: BUILTIN_UNITS,
};

/** Firestore'dagi hujjat: qo'shimcha turlar + yashirilgan standartlar. */
export interface StoredTaxonomy extends Partial<Taxonomy> {
  hidden_categories?: string[];
  hidden_materials?: string[];
  hidden_units?: string[];
}

/**
 * Standart va qo'shimcha ro'yxatlarni birlashtiradi:
 *   • bir xil slug qayta qo'shilmaydi;
 *   • saqlangan nom standartdan ustun turadi (qayta nomlash shunday ishlaydi);
 *   • o'chirilgan standart turlar ro'yxatdan chiqariladi.
 */
export function mergeTaxonomy(stored: StoredTaxonomy | undefined): Taxonomy {
  return {
    categories: merge(BUILTIN_CATEGORIES, stored?.categories, stored?.hidden_categories),
    materials: merge(BUILTIN_MATERIALS, stored?.materials, stored?.hidden_materials),
    units: merge(BUILTIN_UNITS, stored?.units, stored?.hidden_units),
  };
}

/**
 * Yangi tur qo'shilganda nomdan slug yasaymiz. Mantiq `@/lib/slug` da —
 * mahsulot va blog route'lari ham o'shanikini ishlatadi.
 */
export { slugify } from "@/lib/slug";

function merge(
  builtin: TaxonomyItem[],
  custom: TaxonomyItem[] | undefined,
  hidden: string[] | undefined
): TaxonomyItem[] {
  const hiddenSet = new Set(hidden ?? []);
  const overrides = new Map((custom ?? []).filter((i) => i?.slug).map((i) => [i.slug, i.label]));

  const base = builtin
    .filter((item) => !hiddenSet.has(item.slug))
    .map((item) => ({ slug: item.slug, label: overrides.get(item.slug) ?? item.label }));

  const builtinSlugs = new Set(builtin.map((item) => item.slug));
  const extra = (custom ?? []).filter((item) => item?.slug && !builtinSlugs.has(item.slug));
  return [...base, ...extra];
}

/** Slug bo'yicha ko'rinadigan nom (topilmasa slugning o'zi). */
export function labelOf(items: TaxonomyItem[], slug: string | undefined): string {
  if (!slug) return "";
  return items.find((item) => item.slug === slug)?.label ?? slug;
}

/**
 * KIRILL "EGIZAK" HARFLAR.
 *
 * 1C narxnomasidan kelgan nomlarda lotincha so'z ichida kirill harfi
 * uchraydi: "Smestitellar" so'zidagi "е" yoki "а" kirillcha bo'lishi
 * mumkin. Ekranda farqi BILINMAYDI, lekin solishtirganda ikki xil
 * matn bo'lib chiqadi - shuning uchun bot ro'yxatda TURGAN
 * kategoriyani "tanilmadi" deb rad etardi.
 */
const LOOKALIKE: Record<string, string> = {
  а: "a", в: "b", е: "e", ё: "e", к: "k", м: "m", н: "h", о: "o", р: "p",
  с: "c", т: "t", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ԁ: "d", ԛ: "q", ԝ: "w",
};

/**
 * Solishtirish uchun matnni bir ko'rinishga keltiradi: kichik harf,
 * apostrofsiz, kirill egizaklari lotinga o'girilgan, harf va raqamdan
 * boshqasi olib tashlangan ("Smestitellar!" va "smestitellar" bir xil).
 */
function foldForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'`ʻʼ]/g, "")
    .replace(/[Ѐ-ӿԀ-ԯ]/g, (ch) => LOOKALIKE[ch] ?? ch)
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

/** Ikki matn orasidagi tahrir masofasi (Levenshtein). */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * Matnni (masalan Telegram izohidagi "polipropilen") slugga aylantirish.
 *
 * Tartib: to'liq moslik → ichida uchrashi → BIR-IKKI HARF xato bilan
 * yozilgani ("smestitelar", "smesitellar"). Oxirgisi bo'lmasa bot bitta
 * harf xatosi uchun butun kirimni rad etardi.
 */
export function matchTaxonomy(items: TaxonomyItem[], text: string): string | null {
  const clean = foldForMatch(text);
  if (!clean) return null;

  const folded = items.map((item) => ({
    slug: item.slug,
    label: foldForMatch(item.label),
    key: foldForMatch(item.slug),
  }));

  const direct = folded.find((item) => item.key === clean || item.label === clean);
  if (direct) return direct.slug;

  const partial = folded.find(
    (item) =>
      (item.label.length >= 3 && clean.includes(item.label)) ||
      (item.key.length >= 3 && clean.includes(item.key))
  );
  if (partial) return partial.slug;

  // Kichik xatoga yo'l qo'yamiz: 5-7 harfli nomda 1 ta, undan
  // uzunida 2 ta. Qisqa nomlarda ("mis", "pvx") umuman qo'ymaymiz -
  // ular bir-biriga aylanib ketardi.
  if (clean.length < 5) return null;
  const allowed = clean.length >= 8 ? 2 : 1;

  let best: { slug: string; distance: number } | null = null;
  for (const item of folded) {
    for (const candidate of [item.label, item.key]) {
      if (!candidate) continue;
      const distance = editDistance(clean, candidate);
      if (distance <= allowed && (!best || distance < best.distance)) {
        best = { slug: item.slug, distance };
      }
    }
  }
  return best?.slug ?? null;
}

/**
 * Tanilmagan qiymatga ENG YAQIN nomlar (botning xato xabari uchun).
 *
 * Ro'yxatda 40 dan ortiq kategoriya bo'lsa, hammasini yozib tashlash
 * xodimga yordam bermaydi - "shulardan birini nazarda tutdingizmi?"
 * degan qisqa ro'yxat foydaliroq.
 */
export function suggestTaxonomy(items: TaxonomyItem[], text: string, limit = 5): string[] {
  const clean = foldForMatch(text);
  if (!clean) return [];

  return items
    .map((item) => ({
      label: item.label,
      distance: Math.min(
        editDistance(clean, foldForMatch(item.label)),
        editDistance(clean, foldForMatch(item.slug))
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.label);
}
