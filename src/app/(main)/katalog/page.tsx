"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { FilterDialog } from "@/components/product/FilterDialog";
import { SearchBar } from "@/components/product/SearchBar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

function CatalogContent() {
  const searchParams = useSearchParams();
  const { dict } = useI18n();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const filters = useAppSelector((s) => s.filters);

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
      />
      <h1 className="mb-4 text-2xl font-bold text-navy-900 dark:text-white">{dict.nav.catalog}</h1>

      {/* Qidiruv + filtr tugmasi. Filtrlar sahifada doim turmaydi -
          tugma bosilganda modal ochiladi. Panel skrollda header ostida
          yopishib qoladi (`--header-height` - Header.tsx). */}
      <div className="glass sticky top-[var(--header-height,64px)] z-20 mb-4 flex items-center gap-2 rounded-xl2 px-3 py-2">
        <SearchBar value={searchTerm} onChange={setSearchTerm} className="flex-1 lg:max-w-md" />
        <FilterDialog />
      </div>

      <ProductGrid filters={filters} searchTerm={searchTerm} />
    </section>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogContent />
    </Suspense>
  );
}
