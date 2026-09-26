import type { Product } from "@/types/product";

/**
 * MAHSULOT SAHIFASIDAGI "XUSUSIYATLARI" RO'YXATI.
 *
 * Ilgari brend, davlat va kod sarlavha ostida bitta kulrang qatorda
 * ("Calorie • Xitoy • Kod: ...") turardi, o'lchamlar esa alohida
 * jadvalda — material va sotish turi umuman ko'rinmasdi. Mijoz
 * mahsulotni solishtirganda aynan shularni qidiradi (evde.uz dagi
 * "Materiali / Shakli / Qo'llanilishi" ro'yxati kabi).
 *
 * Sof funksiya: faqat BOR qiymatlar chiqadi — bo'sh qatorlar
 * ("Material: —") mijozni chalg'itadi. Testi `specs.test.ts`.
 *
 * DIQQAT: bu yerga narx, tannarx, yetkazib beruvchi kabi maydonlar
 * QO'SHILMAYDI — ro'yxat to'g'ridan-to'g'ri HTMLga chiqadi.
 */
export interface SpecRow {
  label: string;
  value: string;
}

export interface SpecLabels {
  category: string;
  brand: string;
  country: string;
  material: string;
  saleUnit: string;
  diameter: string;
  length: string;
  weight: string;
  code: string;
}

export function productSpecs(
  product: Pick<Product, "brand" | "manufacturerCountry" | "sku" | "dimensions">,
  resolved: { categoryLabel: string; materialLabel: string; unitLabel: string },
  labels: SpecLabels
): SpecRow[] {
  const dims = product.dimensions ?? {};
  const rows: [string, string | number | undefined | null, string?][] = [
    [labels.category, resolved.categoryLabel],
    [labels.brand, product.brand],
    [labels.country, product.manufacturerCountry],
    [labels.material, resolved.materialLabel],
    [labels.saleUnit, resolved.unitLabel],
    [labels.diameter, dims.diameterMm, "mm"],
    [labels.length, dims.lengthMm, "mm"],
    [labels.weight, dims.weightKg, "kg"],
    [labels.code, product.sku],
  ];

  return rows
    .map(([label, raw, suffix]) => {
      const text = raw === undefined || raw === null ? "" : String(raw).trim();
      return { label, value: text && suffix ? `${text} ${suffix}` : text };
    })
    .filter((row) => row.value.length > 0);
}
