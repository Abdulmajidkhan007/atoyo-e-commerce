import { describe, expect, it } from "vitest";
import { productSpecs as siteSpecs, type SpecLabels } from "./specs";
import { productSpecs as appSpecs } from "../../../mobile/src/specs";
import type { Product } from "@/types/product";

/**
 * "XUSUSIYATLARI": SAYT === ILOVA (qulf, AUDIT-ISHLARI 15).
 * Ilova nusxasi (`mobile/src/specs.ts`) saytnikidan qolib ketsa —
 * mijoz sayt va ilovada har xil ro'yxat ko'radi. Bittasini
 * o'zgartirsangiz ikkinchisini ham o'zgartiring.
 */
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

type SpecInput = Pick<Product, "brand" | "manufacturerCountry" | "sku" | "dimensions">;

const PRODUCTS: SpecInput[] = [
  { brand: "Calorie", manufacturerCountry: "Xitoy", sku: "SJ-03", dimensions: { diameterMm: 20 } },
  { brand: "", manufacturerCountry: "Turkiya", sku: "  ", dimensions: {} },
  { brand: "Valtec", manufacturerCountry: "", sku: "", dimensions: { diameterMm: 32, lengthMm: 4000, weightKg: 1.25 } },
  { brand: " Kludi ", manufacturerCountry: " Germaniya ", sku: "K-1", dimensions: undefined as unknown as Product["dimensions"] },
  { brand: "A", manufacturerCountry: "B", sku: "C", dimensions: { diameterMm: 0, lengthMm: undefined, weightKg: 0.5 } },
];

const RESOLVED = [
  { categoryLabel: "Kranlar", materialLabel: "Latun", unitLabel: "dona" },
  { categoryLabel: "", materialLabel: "", unitLabel: "" },
  { categoryLabel: " Quvurlar ", materialLabel: "PPR", unitLabel: "metr" },
];

describe("xususiyatlar: sayt === ilova", () => {
  PRODUCTS.forEach((product, i) => {
    RESOLVED.forEach((resolved, j) => {
      it(`mahsulot ${i}, nomlar ${j}`, () => {
        expect(appSpecs(product, resolved, LABELS)).toEqual(siteSpecs(product, resolved, LABELS));
      });
    });
  });
});
