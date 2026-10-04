/**
 * MAHSULOT EKRANIDAGI "XUSUSIYATLARI" RO'YXATI — ilova nusxasi.
 *
 * Ilova sayt kodini import qila olmaydi, shuning uchun mantiq
 * saytdagi `src/lib/products/specs.ts` dan KO'CHIRILGAN. Fayl hech
 * narsa import qilmaydi (sof) — sayt vitest'i ikkalasini YONMA-YON
 * sinaydi (`src/lib/products/specs-mobile-parity.test.ts`): bittasi
 * o'zgarib, ikkinchisi eskicha qolsa test yiqiladi.
 *
 * Faqat BOR qiymatlar chiqadi. Narx, tannarx, yetkazib beruvchi kabi
 * maydonlar bu yerga QO'SHILMAYDI.
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

export interface SpecDimensions {
  diameterMm?: number;
  lengthMm?: number;
  weightKg?: number;
}

export function productSpecs(
  product: {
    brand?: string | null;
    manufacturerCountry?: string | null;
    sku?: string | null;
    dimensions?: SpecDimensions | null;
  },
  resolved: {categoryLabel: string; materialLabel: string; unitLabel: string},
  labels: SpecLabels,
): SpecRow[] {
  const dims = product.dimensions ?? {};
  const rows: [string, string | number | undefined | null, string?][] = [
    [labels.category, resolved.categoryLabel],
    [labels.brand, product.brand],
    [labels.country, product.manufacturerCountry],
    [labels.material, resolved.materialLabel],
    [labels.saleUnit, resolved.unitLabel],
    [labels.diameter, dims.diameterMm, 'mm'],
    [labels.length, dims.lengthMm, 'mm'],
    [labels.weight, dims.weightKg, 'kg'],
    [labels.code, product.sku],
  ];

  return rows
    .map(([label, raw, suffix]) => {
      const text = raw === undefined || raw === null ? '' : String(raw).trim();
      return {label, value: text && suffix ? `${text} ${suffix}` : text};
    })
    .filter(row => row.value.length > 0);
}
