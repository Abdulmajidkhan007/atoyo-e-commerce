import type { ProductFilterParams } from "@/types/product";

/**
 * KATALOG FILTRINING "KALITI" — serverda chizilgan birinchi sahifa
 * shu filtr uchunmi, yo'qmi.
 *
 * NOSOZLIK (shu funksiya sababi): bosh sahifadagi kategoriya
 * kartochkasi filtrni faqat Redux'ga yozib `/katalog` ga o'tardi.
 * Server esa manzilda filtr ko'rmay FILTRSIZ ro'yxatni chizardi,
 * `ProductGrid` esa "birinchi sahifa serverdan keldi" deb uni
 * qayta so'ramasdi — mijoz "Kranlar" deb bosib, har xil mahsulot
 * ko'rardi. Endi birinchi sahifa FAQAT kalitlar mos kelsa
 * ishlatiladi; mos kelmasa odatdagidek qayta so'raladi.
 *
 * Sof funksiya, testi `filters-key.test.ts`.
 */
export function catalogFiltersKey(filters: ProductFilterParams): string {
  return JSON.stringify([
    filters.category ?? "",
    filters.brand ?? "",
    filters.material ?? "",
    filters.manufacturerCountry ?? "",
    filters.minPrice ?? "",
    filters.maxPrice ?? "",
    filters.inStockOnly === true,
    filters.sortBy ?? "newest",
  ]);
}

/** Manzildagi filtrlar (`?category=...&brand=...`). Bo'shlari tashlanadi. */
export function filtersFromSearchParams(
  params: { get(name: string): string | null }
): Partial<ProductFilterParams> {
  const result: Partial<ProductFilterParams> = {};
  const category = params.get("category")?.trim();
  const brand = params.get("brand")?.trim();
  const material = params.get("material")?.trim();
  const country = params.get("country")?.trim();
  if (category) result.category = category as ProductFilterParams["category"];
  if (brand) result.brand = brand;
  if (material) result.material = material as ProductFilterParams["material"];
  if (country) result.manufacturerCountry = country;
  return result;
}
