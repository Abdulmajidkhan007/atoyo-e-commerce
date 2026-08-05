import { describe, expect, it } from "vitest";
import { parseIntakeCaption } from "./intake-parser";
import { BUILTIN_TAXONOMY } from "@/lib/products/taxonomy";

const taxonomy = BUILTIN_TAXONOMY;

describe("parseIntakeCaption", () => {
  it("oddiy kirimni o'qiydi", () => {
    const parsed = parseIntakeCaption(
      [
        "PPR quvur 25mm",
        "Kategoriya: quvurlar",
        "Narxi: 45 000",
        "Soni: 120",
        "Sotish turi: metr",
        "Kimdan: Akmal aka",
        "Material: polipropilen",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.name).toBe("PPR quvur 25mm");
    expect(parsed.price).toBe(45000);
    expect(parsed.stock).toBe(120);
    expect(parsed.variants).toEqual([]);
  });

  it("turlarni o'qiydi: narx eng arzonidan, zaxira yig'indidan", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham",
        "Turlar:",
        "50x60 - 850000 - 4 - BS-5060",
        "60x80 - 990000 - 2",
        "80x100 - 1150000 - 0",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.variantAxisLabels).toEqual(["O'lcham"]);
    expect(parsed.variants).toHaveLength(3);
    expect(parsed.variants[0]).toEqual({
      values: ["50x60"],
      price: 850000,
      stock: 4,
      sku: "BS-5060",
    });
    // Narx - eng arzon tur, zaxira - hamma turlar yig'indisi.
    expect(parsed.price).toBe(850000);
    expect(parsed.stock).toBe(6);
  });

  it("ikki qatorli turni \"|\" bilan tushunadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Alyuminiy radiator",
        "Kategoriya: radiator",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Bek ota",
        "Tur nomi: Balandlik|Rang",
        "Turlar:",
        "500mm|Oq - 320000 - 3",
        "800mm|Oq - 410000 - 1",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variantAxisLabels).toEqual(["Balandlik", "Rang"]);
    expect(parsed.variants.map((variant) => variant.values)).toEqual([
      ["500mm", "Oq"],
      ["800mm", "Oq"],
    ]);
    expect(parsed.stock).toBe(4);
  });

  it("turlardan keyin yozilgan kalitli qator ro'yxatni to'xtatadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Turlar:",
        "50x60 - 850000 - 4",
        "Kimdan: Akmal aka",
        "Brend: Basu",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.supplier).toBe("Akmal aka");
    expect(parsed.brand).toBe("Basu");
    expect(parsed.missing).toEqual([]);
  });

  it("noto'g'ri tur qatori ogohlantirishga tushadi, qolganlari saqlanadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Tur nomi: O'lcham",
        "Turlar:",
        "50x60 - 850000 - 4",
        "60x80",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.variants).toHaveLength(1);
    expect(parsed.warnings.some((warning) => warning.includes("60x80"))).toBe(true);
  });

  it("turlar bo'lsa umumiy narx/soni yozilmasa ham yetadi", () => {
    const parsed = parseIntakeCaption(
      [
        "Basu moyka",
        "Kategoriya: santexnika",
        "Material: polat",
        "Sotish turi: dona",
        "Kimdan: Akmal aka",
        "Turlar:",
        "50x60 - 850000 - 4",
      ].join("\n"),
      taxonomy
    );

    expect(parsed.missing).toEqual([]);
    expect(parsed.variantAxisLabels).toEqual(["Turi"]);
  });
});
