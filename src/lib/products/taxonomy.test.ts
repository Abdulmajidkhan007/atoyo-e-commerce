import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, labelOf, matchTaxonomy, mergeTaxonomy, slugify } from "./taxonomy";

describe("mergeTaxonomy", () => {
  it("saqlangan ro'yxat bo'lmasa - standartlari", () => {
    expect(mergeTaxonomy(undefined).categories).toEqual(BUILTIN_CATEGORIES);
  });

  it("admin qo'shgan yangi kategoriya oxiriga qo'shiladi", () => {
    const merged = mergeTaxonomy({ categories: [{ slug: "moyka", label: "Moykalar" }] });
    expect(merged.categories.at(-1)).toEqual({ slug: "moyka", label: "Moykalar" });
    expect(merged.categories).toHaveLength(BUILTIN_CATEGORIES.length + 1);
  });

  it("standart kategoriyani qayta nomlash mumkin", () => {
    const merged = mergeTaxonomy({ categories: [{ slug: "pipes", label: "Trubalar" }] });
    expect(labelOf(merged.categories, "pipes")).toBe("Trubalar");
    expect(merged.categories).toHaveLength(BUILTIN_CATEGORIES.length);
  });

  it("yashirilgan standart kategoriya ro'yxatdan chiqadi", () => {
    const merged = mergeTaxonomy({ hidden_categories: ["pumps"] });
    expect(merged.categories.some((item) => item.slug === "pumps")).toBe(false);
  });
});

describe("labelOf", () => {
  it("topilmasa slugning o'zini qaytaradi", () => {
    expect(labelOf(BUILTIN_CATEGORIES, "yangi-tur")).toBe("yangi-tur");
    expect(labelOf(BUILTIN_CATEGORIES, undefined)).toBe("");
  });
});

describe("slugify", () => {
  it("apostrof va bo'sh joyni tozalaydi", () => {
    expect(slugify("Yangi o'lcham")).toBe("yangi-olcham");
  });

  it("bo'sh nomga ham slug beradi", () => {
    expect(slugify("!!!").length).toBeGreaterThan(0);
  });
});

describe("matchTaxonomy", () => {
  it("Telegram izohidagi so'zni slugga aylantiradi", () => {
    expect(matchTaxonomy(BUILTIN_CATEGORIES, "Kranlar")).toBe("faucets");
    expect(matchTaxonomy(BUILTIN_CATEGORIES, "dush tizimlari")).toBe("shower-systems");
  });

  it("mos kelmasa null", () => {
    expect(matchTaxonomy(BUILTIN_CATEGORIES, "kompyuter")).toBeNull();
  });
});
