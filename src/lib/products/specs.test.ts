import { describe, expect, it } from "vitest";
import { productSpecs, type SpecLabels } from "./specs";
import type { Product } from "@/types/product";

const LABELS: SpecLabels = {
  category: "Kategoriya",
  brand: "Brend",
  country: "Davlat",
  material: "Material",
  saleUnit: "Sotish turi",
  diameter: "Diametri",
  length: "Uzunligi",
  weight: "Vazni",
  code: "Kod",
};

const base = {
  brand: "Calorie",
  manufacturerCountry: "Xitoy",
  sku: "SJ-03",
  dimensions: { diameterMm: 20 },
} as Pick<Product, "brand" | "manufacturerCountry" | "sku" | "dimensions">;

describe("productSpecs", () => {
  it("bor qiymatlarni tartib bilan chiqaradi, o'lchamga birlik qo'shadi", () => {
    const rows = productSpecs(
      base,
      { categoryLabel: "Kranlar", materialLabel: "Latun", unitLabel: "dona" },
      LABELS
    );
    expect(rows.map((row) => `${row.label}: ${row.value}`)).toEqual([
      "Kategoriya: Kranlar",
      "Brend: Calorie",
      "Davlat: Xitoy",
      "Material: Latun",
      "Sotish turi: dona",
      "Diametri: 20 mm",
      "Kod: SJ-03",
    ]);
  });

  it("bo'sh qiymatli qatorlar CHIQMAYDI (\"Material: —\" bo'lmasin)", () => {
    const rows = productSpecs(
      { ...base, brand: "", sku: "  ", dimensions: {} } as typeof base,
      { categoryLabel: "Kranlar", materialLabel: "", unitLabel: "dona" },
      LABELS
    );
    expect(rows.map((row) => row.label)).toEqual(["Kategoriya", "Davlat", "Sotish turi"]);
  });

  it("o'lchamlar umuman bo'lmasa ham yiqilmaydi", () => {
    const rows = productSpecs(
      { ...base, dimensions: undefined } as unknown as typeof base,
      { categoryLabel: "", materialLabel: "", unitLabel: "" },
      LABELS
    );
    expect(rows.map((row) => row.label)).toEqual(["Brend", "Davlat", "Kod"]);
  });
});
