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

/** Matnni (masalan Telegram izohidagi "polipropilen") slugga aylantirish. */
export function matchTaxonomy(items: TaxonomyItem[], text: string): string | null {
  const clean = text.toLowerCase().replace(/[’'`ʻʼ]/g, "").trim();
  if (!clean) return null;

  const direct = items.find(
    (item) =>
      item.slug === clean ||
      item.label.toLowerCase().replace(/[’'`ʻʼ]/g, "") === clean
  );
  if (direct) return direct.slug;

  const partial = items.find((item) => {
    const label = item.label.toLowerCase().replace(/[’'`ʻʼ]/g, "");
    return clean.includes(label) || clean.includes(item.slug);
  });
  return partial?.slug ?? null;
}
