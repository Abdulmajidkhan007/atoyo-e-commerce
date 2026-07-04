"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppSelector } from "@/redux/hooks";
import { FilterPanel } from "@/components/product/FilterPanel";
import { SearchBar } from "@/components/product/SearchBar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useTranslation } from "@/i18n/I18nProvider";

function CatalogContent() {
  const searchParams = useSearchParams();
  const t = useTranslation();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const filters = useAppSelector((s) => s.filters);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-navy-900 dark:text-white">{t.catalog.title}</h1>

      <div className="mb-4 lg:hidden">
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterPanel />

        <div className="flex-1">
          <div className="mb-4 hidden lg:block">
            <SearchBar value={searchTerm} onChange={setSearchTerm} className="max-w-md" />
          </div>

          <ProductGrid filters={filters} searchTerm={searchTerm} />
        </div>
      </div>
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
