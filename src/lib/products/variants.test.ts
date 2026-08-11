import { describe, expect, it } from "vitest";
import {
  allCombinations,
  defaultVariant,
  findVariant,
  hasVariants,
  minVariantPrice,
  normalizeVariants,
  totalVariantStock,
  variantIdOf,
  variantLabel,
  variantPrice,
} from "./variants";
import type { ProductVariant, VariantAxis } from "@/types/product";

const axes: VariantAxis[] = [
  { key: "olcham", label: "O'lcham", values: ["50x45", "55x45"] },
  { key: "rang", label: "Rangi", values: ["qora"] },
];

const variants: ProductVariant[] = [
  { id: "50x45|qora", options: { olcham: "50x45", rang: "qora" }, price: 225000, discountPrice: null, stock: 3 },
  { id: "55x45|qora", options: { olcham: "55x45", rang: "qora" }, price: 235000, discountPrice: null, stock: 2 },
];

describe("variantIdOf / allCombinations", () => {
  it("hamma kombinatsiyani yasaydi", () => {
    expect(allCombinations(axes)).toHaveLength(2);
  });

  it("kalit qatorlar tartibida bo'ladi", () => {
    expect(variantIdOf(axes, { olcham: "50x45", rang: "qora" })).toBe("50x45|qora");
  });
});

describe("normalizeVariants", () => {
  it("qatorlarga mos kelmagan eski turlarni tashlaydi", () => {
    const stale = [...variants, { id: "60x45|qora", options: { olcham: "60x45", rang: "qora" }, price: 1, discountPrice: null, stock: 9 }];
    const clean = normalizeVariants(axes, stale);
    expect(clean.variants).toHaveLength(2);
    expect(clean.variants.map((v) => v.id)).not.toContain("60x45|qora");
  });

  it("mavjud narx va zaxirani saqlaydi", () => {
    const clean = normalizeVariants(axes, variants);
    expect(clean.variants[0]?.price).toBe(225000);
    expect(clean.variants[1]?.stock).toBe(2);
  });

  it("yangi kombinatsiyani nol narx bilan qo'shadi", () => {
    const wider: VariantAxis[] = [
      { key: "olcham", label: "O'lcham", values: ["50x45", "55x45", "58x45"] },
      { key: "rang", label: "Rangi", values: ["qora"] },
    ];
    const clean = normalizeVariants(wider, variants);
    expect(clean.variants).toHaveLength(3);
    expect(clean.variants[2]).toMatchObject({ price: 0, stock: 0 });
  });

  it("qiymati yo'q qatorni butunlay olib tashlaydi", () => {
    const clean = normalizeVariants([{ key: "olcham", label: "O'lcham", values: [] }], variants);
    expect(clean.axes).toHaveLength(0);
    expect(clean.variants).toHaveLength(0);
  });

  // "Bunday turi yo'q" deb belgilangan kombinatsiya har qayta
  // yasalganda tiklanib turardi - endi ro'yxatda qolib ketadi.
  it("mavjud bo'lmagan kombinatsiyani qaytarmaydi", () => {
    const clean = normalizeVariants(axes, variants, ["55x45|qora"]);
    expect(clean.variants.map((v) => v.id)).toEqual(["50x45|qora"]);
    expect(clean.variantsExcluded).toEqual(["55x45|qora"]);
  });

  it("qatorlar o'zgarsa eskirgan 'yo'q' kalitlarini tozalaydi", () => {
    const narrower: VariantAxis[] = [
      { key: "olcham", label: "O'lcham", values: ["50x45"] },
      { key: "rang", label: "Rangi", values: ["qora"] },
    ];
    const clean = normalizeVariants(narrower, variants, ["55x45|qora"]);
    expect(clean.variants).toHaveLength(1);
    expect(clean.variantsExcluded).toEqual([]);
  });
});

describe("narx va zaxira", () => {
  it("eng arzon tur narxi", () => {
    expect(minVariantPrice({ variants })).toBe(225000);
  });

  it("chegirmali tur arzon narxda hisoblanadi", () => {
    expect(variantPrice({ price: 100000, discountPrice: 80000 })).toBe(80000);
    expect(variantPrice({ price: 100000, discountPrice: null })).toBe(100000);
    // Chegirma narxi asosiydan katta bo'lsa - e'tiborga olinmaydi.
    expect(variantPrice({ price: 100000, discountPrice: 120000 })).toBe(100000);
  });

  it("zaxira yig'indisi", () => {
    expect(totalVariantStock({ variants })).toBe(5);
  });
});

describe("tanlash", () => {
  it("mavjud turni topadi", () => {
    expect(findVariant({ variantAxes: axes, variants }, { olcham: "55x45", rang: "qora" })?.price).toBe(235000);
  });

  it("birinchi zaxirasi bor tur standart bo'ladi", () => {
    const soldOutFirst = [{ ...variants[0]!, stock: 0 }, variants[1]!];
    expect(defaultVariant({ variantAxes: axes, variants: soldOutFirst })?.id).toBe("55x45|qora");
  });

  it("nomi o'qiladigan ko'rinishda", () => {
    expect(variantLabel({ variantAxes: axes }, variants[0]!)).toBe("50x45 • qora");
  });

  it("turlari yo'q mahsulot", () => {
    expect(hasVariants({ variantAxes: [], variants: [] })).toBe(false);
    expect(hasVariants({ variantAxes: axes, variants })).toBe(true);
  });
});
