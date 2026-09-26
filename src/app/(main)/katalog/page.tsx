import { Suspense } from "react";
import { CatalogContent } from "@/components/product/CatalogContent";
import { loadChipCategories, loadStorefrontPage } from "@/lib/products/storefront";
import { catalogFiltersKey } from "@/lib/products/filters-key";
import type { ProductFilterParams } from "@/types/product";

/**
 * KATALOG — birinchi sahifa SERVERDA chiziladi.
 *
 * Ilgari bu sahifa butunlay client edi va HTML'da
 * "Hech qanday mahsulot topilmadi" deb turardi: Google ham, sekin
 * internetdagi mijoz ham bo'sh do'kon ko'rardi. Endi birinchi 24 ta
 * mahsulot HTML bilan birga keladi; filtr/qidiruv va cheksiz skroll
 * avvalgidek client tomonda ishlaydi.
 *
 * Narx `toViewerProducts()` dan o'tadi (`lib/products/storefront.ts`) —
 * optom narx HTMLga TUSHMAYDI.
 */
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  // Manzildagi filtrlar serverda ham qo'llanadi - shunda
  // `/katalog?category=faucets` havolasi to'g'ri ro'yxat bilan ochiladi.
  const filters: ProductFilterParams = {
    category: one("category"),
    brand: one("brand"),
    material: one("material"),
    manufacturerCountry: one("country"),
    sortBy: "newest",
  };

  const [page, categories] = await Promise.all([loadStorefrontPage(filters), loadChipCategories()]);

  return (
    <Suspense fallback={null}>
      <CatalogContent
        initialProducts={page.products}
        initialCursor={page.nextCursor}
        initialHasMore={page.hasMore}
        initialFiltersKey={catalogFiltersKey(filters)}
        categories={categories}
      />
    </Suspense>
  );
}
