"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setFilters } from "@/redux/slices/filterSlice";
import { filtersFromSearchParams } from "@/lib/products/filters-key";
import { CategoryChips, type ChipCategory } from "@/components/product/CategoryChips";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { FilterDialog } from "@/components/product/FilterDialog";
import { SearchBar } from "@/components/product/SearchBar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import type { Product } from "@/types/product";

interface CatalogContentProps {
  initialProducts: Product[];
  initialCursor: string | null;
  initialHasMore: boolean;
  /** Server qaysi filtr bilan chizgan (`catalogFiltersKey`). */
  initialFiltersKey: string;
  /** Mahsuloti bor kategoriyalar (chiplar uchun). */
  categories: ChipCategory[];
}

export function CatalogContent({
  initialProducts,
  initialCursor,
  initialHasMore,
  initialFiltersKey,
  categories,
}: CatalogContentProps) {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { dict, locale } = useI18n();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const reduxFilters = useAppSelector((s) => s.filters);

  /**
   * MANZIL → REDUX.
   *
   * `/katalog?category=faucets` havolasi (chip, bosh sahifa kartochkasi,
   * Google, ulashilgan havola) bilan kelgan mijozda filtr faqat
   * manzilda bo'ladi. Birinchi chizishda manzildagi qiymat ustun
   * turadi (aks holda `ProductGrid` birinchi so'rovni noto'g'ri filtr
   * bilan yuborardi), keyin u Redux'ga bir marta yoziladi va filtr
   * oynasi ham shuni ko'rsatadi. Manzilda filtr bo'lmasa Redux'dagi
   * tanlov saqlanib qoladi (avvalgi xatti-harakat).
   */
  const urlKey = searchParams.toString();
  const urlFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const hasUrlFilters = Object.keys(urlFilters).length > 0;
  const needsSync = hasUrlFilters && reduxFilters.urlSyncedFor !== urlKey;
  const filters = needsSync ? { ...reduxFilters, ...urlFilters } : reduxFilters;

  useEffect(() => {
    if (needsSync) dispatch(setFilters({ ...urlFilters, urlSyncedFor: urlKey }));
  }, [needsSync, urlKey, urlFilters, dispatch]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      {/* Filtrlangan bo'lsa zanjirda kategoriya ham ko'rinadi. */}
      <Breadcrumbs
        items={
          filters.category
            ? [
                { name: dict.nav.catalog, href: "/katalog" },
                {
                  name:
                    (dict.categories as Record<string, string>)[filters.category] ??
                    filters.category,
                },
              ]
            : [{ name: dict.nav.catalog }]
        }
        locale={locale}
      />
      <h1 className="mb-4 text-2xl font-bold text-navy-900 dark:text-white">{dict.nav.catalog}</h1>

      {/* Qidiruv + filtr tugmasi. Filtrlar sahifada doim turmaydi -
          tugma bosilganda modal ochiladi. Panel skrollda header ostida
          yopishib qoladi (`--header-height` - Header.tsx). */}
      <div className="glass sticky top-[var(--header-height,64px)] z-20 mb-4 flex items-center gap-2 rounded-xl2 px-3 py-2">
        <SearchBar value={searchTerm} onChange={setSearchTerm} className="flex-1 lg:max-w-md" />
        <FilterDialog />
      </div>

      <CategoryChips categories={categories} active={filters.category ?? null} className="mb-4" />

      <ProductGrid
        filters={filters}
        searchTerm={searchTerm}
        initialProducts={initialProducts}
        initialCursor={initialCursor}
        initialHasMore={initialHasMore}
        initialFiltersKey={initialFiltersKey}
      />
    </section>
  );
}
