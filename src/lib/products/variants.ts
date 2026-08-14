import type { Product, ProductVariant, VariantAxis } from "@/types/product";

/**
 * TURLAR (variantlar) bilan ishlash yordamchilari.
 *
 * Client ham, server ham ishlatadi - shuning uchun "server-only" YO'Q va
 * bu yerda Firebase importi bo'lmasligi kerak.
 */

/** Mahsulotning turlari bormi (tanlash kerakmi). */
export function hasVariants(product: Pick<Product, "variantAxes" | "variants">): boolean {
  return (product.variantAxes?.length ?? 0) > 0 && (product.variants?.length ?? 0) > 0;
}

/** Tanlangan qiymatlardan barqaror kalit yasaydi: "50x60|0.3mm". */
export function variantIdOf(axes: VariantAxis[], options: Record<string, string>): string {
  return axes.map((axis) => options[axis.key] ?? "").join("|");
}

/** Qiymatlarning hamma kombinatsiyasi (dekart ko'paytmasi). */
export function allCombinations(axes: VariantAxis[]): Record<string, string>[] {
  return axes.reduce<Record<string, string>[]>(
    (acc, axis) =>
      acc.flatMap((combo) => axis.values.map((value) => ({ ...combo, [axis.key]: value }))),
    [{}]
  );
}

/** Tanlangan qiymatlarga mos turni topadi. */
export function findVariant(
  product: Pick<Product, "variantAxes" | "variants">,
  options: Record<string, string>
): ProductVariant | null {
  const axes = product.variantAxes ?? [];
  const id = variantIdOf(axes, options);
  return (product.variants ?? []).find((variant) => variant.id === id) ?? null;
}

/** Sahifa ochilganda tanlangan bo'lib turadigan tur: birinchi mavjudi. */
export function defaultVariant(
  product: Pick<Product, "variantAxes" | "variants">
): ProductVariant | null {
  const variants = product.variants ?? [];
  return variants.find((variant) => variant.stock > 0) ?? variants[0] ?? null;
}

/** "50x60 • 0.3mm" ko'rinishidagi nom (savat va buyurtmada ko'rinadi). */
export function variantLabel(
  product: Pick<Product, "variantAxes">,
  variant: Pick<ProductVariant, "options">
): string {
  return (product.variantAxes ?? [])
    .map((axis) => variant.options[axis.key])
    .filter(Boolean)
    .join(" • ");
}

/** Turning amaldagi narxi (chegirmasi bo'lsa - chegirma narxi). */
export function variantPrice(variant: Pick<ProductVariant, "price" | "discountPrice">): number {
  const discount = variant.discountPrice ?? null;
  return discount !== null && discount > 0 && discount < variant.price ? discount : variant.price;
}

/** Eng arzon tur narxi - katalog kartasida "... dan" deb ko'rsatiladi. */
export function minVariantPrice(product: Pick<Product, "variants">): number | null {
  const prices = (product.variants ?? []).map(variantPrice);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Hamma turlarning zaxirasi yig'indisi. */
export function totalVariantStock(product: Pick<Product, "variants">): number {
  return (product.variants ?? []).reduce((sum, variant) => sum + Math.max(0, variant.stock), 0);
}

/**
 * Turlar ro'yxatini QATORLARGA moslab tozalaydi.
 *
 * Tahrirlash paytida har bosishda kombinatsiyalar qayta yasaladi va
 * eski (yarim yozilgan) qiymatlardan qolgan turlar saqlanib qolishi
 * mumkin edi - saqlashdan oldin shu funksiya faqat HOZIRGI qatorlarga
 * mos turlarni qoldiradi, narx/zaxira esa o'z joyida qoladi.
 */
export function normalizeVariants(
  axes: VariantAxis[],
  variants: ProductVariant[],
  /** Haqiqatda mavjud bo'lmagan kombinatsiyalar (o'chirilganlari). */
  excluded: string[] = []
): { axes: VariantAxis[]; variants: ProductVariant[]; variantsExcluded: string[] } {
  const usable = axes
    .map((axis) => ({ ...axis, values: axis.values.map((v) => v.trim()).filter(Boolean) }))
    .filter((axis) => axis.key && axis.label.trim() && axis.values.length > 0);

  if (usable.length === 0) return { axes: [], variants: [], variantsExcluded: [] };

  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const skip = new Set(excluded);
  const all = allCombinations(usable).map((options) => {
    const id = variantIdOf(usable, options);
    const previous = byId.get(id);
    return previous
      ? { ...previous, id, options }
      : { id, options, price: 0, discountPrice: null, stock: 0 };
  });

  const kept = all.filter((variant) => !skip.has(variant.id));

  /**
   * QATORDAGI QIYMAT ham tozalanadi.
   *
   * Tur o'chirilganda (masalan sinov uchun qo'shilgan "Tets") u
   * `variants` dan chiqardi, lekin `axes[].values` da qolib ketardi -
   * saytda o'sha tugma turaverar, bosilganda esa mos tur topilmay
   * "Mahsulot tugagan" deb ko'rinardi. Endi hech qaysi turda
   * ishlatilmayotgan qiymat qatordan ham olib tashlanadi.
   */
  const cleanAxes = usable
    .map((axis) => ({
      ...axis,
      values: axis.values.filter((value) =>
        kept.some((variant) => variant.options[axis.key] === value)
      ),
    }))
    .filter((axis) => axis.values.length > 0);

  return {
    axes: cleanAxes,
    variants: kept,
    // Qatorlar o'zgargan bo'lsa endi mavjud bo'lmagan kalitlar
    // ro'yxatda qolib ketmasin - faqat hozirgi kombinatsiyalar.
    variantsExcluded: all.filter((variant) => skip.has(variant.id)).map((variant) => variant.id),
  };
}

/** Kalit (slug) yasash: "O'lcham" -> "olcham". */
export function axisKeyOf(label: string): string {
  const map: Record<string, string> = { "'": "", "ʼ": "", "‘": "", "’": "" };
  return (
    label
      .toLowerCase()
      .replace(/['ʼ‘’]/g, (ch) => map[ch] ?? "")
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "tur"
  );
}
