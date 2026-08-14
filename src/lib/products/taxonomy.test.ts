import { describe, expect, it } from "vitest";
import {
  BUILTIN_CATEGORIES,
  labelOf,
  matchTaxonomy,
  mergeTaxonomy,
  slugify,
  suggestTaxonomy,
} from "./taxonomy";

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

describe("matchTaxonomy - qiyin holatlar", () => {
  const items = [
    { slug: "smestitellar", label: "Smestitellar" },
    { slug: "moyka", label: "Moyka" },
    { slug: "kranlar", label: "Kranlar" },
  ];

  // 1C narxnomasidan kelgan nomda lotin so'z ichida KIRILL harfi
  // bo'lishi mumkin - ekranda bilinmaydi, lekin solishtirishda
  // ikki xil matn bo'lib chiqardi va bot "tanilmadi" derdi.
  it("kirill egizak harfli nomni tanidi", () => {
    const cyrillic = [{ slug: "smestitellar", label: "Smеstitеllar" }];
    expect(matchTaxonomy(cyrillic, "Smestitellar")).toBe("smestitellar");
    // Teskarisi ham: kirillcha yozib yuborilsa.
    expect(matchTaxonomy(items, "Smеstitеllar")).toBe("smestitellar");
  });

  it("bir-ikki harf xatosini kechiradi", () => {
    expect(matchTaxonomy(items, "smestitelar")).toBe("smestitellar");
    expect(matchTaxonomy(items, "Kranler")).toBe("kranlar");
  });

  it("butunlay boshqa so'zni tanimaydi", () => {
    expect(matchTaxonomy(items, "termostat")).toBeNull();
  });

  it("ortiqcha belgi va bo'shliq xalaqit bermaydi", () => {
    expect(matchTaxonomy(items, "  Smestitellar!  ")).toBe("smestitellar");
  });
});

describe("suggestTaxonomy", () => {
  const items = [
    { slug: "smestitellar", label: "Smestitellar" },
    { slug: "moyka", label: "Moyka" },
    { slug: "termostat", label: "Termostat" },
  ];

  it("eng yaqin nomni birinchi qaytaradi", () => {
    expect(suggestTaxonomy(items, "smestitel", 2)[0]).toBe("Smestitellar");
  });

  it("chegaradan ko'p qaytarmaydi", () => {
    expect(suggestTaxonomy(items, "moyk", 1)).toEqual(["Moyka"]);
  });
});
