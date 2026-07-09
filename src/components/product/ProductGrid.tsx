"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { CircularProgress } from "@mui/material";
import { getProductsPage, searchProductsByPrefix } from "@/lib/firebase/firestore";
import { createFuzzySearcher } from "@/lib/search/fuzzy";
import { useI18n } from "@/lib/i18n/LocaleContext";
import { ProductCard } from "./ProductCard";
import type { Product, ProductFilterParams } from "@/types/product";

const PAGE_SIZE = 24;
const SEARCH_WINDOW_SIZE = 60;

interface ProductGridProps {
  filters: ProductFilterParams;
  searchTerm: string;
}

export function ProductGrid({ filters, searchTerm }: ProductGridProps) {
  const { dict } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const trimmedSearch = searchTerm.trim();
  const { category, brand, material, manufacturerCountry, minPrice, maxPrice, inStockOnly, sortBy } = filters;

  // Filtrlar yoki qidiruv o'zgarganda ro'yxat noldan boshlanadi (cursor
  // ham tozalanadi, chunki eski cursor yangi so'rov shartlariga mos kelmaydi).
  useEffect(() => {
    let cancelled = false;

    async function loadFirstPage() {
      setProducts([]);
      setCursor(null);
      setHasMore(true);
      setError(null);
      setIsLoading(true);

      try {
        if (trimmedSearch) {
          // Tezkor server-side prefiks qidiruv, so'ng mijoz tomonda
          // typo-tolerant qayta saralash (lib/search/fuzzy.ts).
          const prefixResults = await searchProductsByPrefix(trimmedSearch, SEARCH_WINDOW_SIZE);
          if (cancelled) return;
          setProducts(createFuzzySearcher(prefixResults)(trimmedSearch));
          setHasMore(false);
        } else {
          const page = await getProductsPage(filters, PAGE_SIZE, null);
          if (cancelled) return;
          setProducts(page.products);
          setCursor(page.lastCursor);
          setHasMore(page.hasMore);
        }
      } catch {
        if (!cancelled) setError(dict.product.loadError);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFirstPage();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, brand, material, manufacturerCountry, minPrice, maxPrice, inStockOnly, sortBy, trimmedSearch]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || trimmedSearch) return;
    setIsLoading(true);
    try {
      const page = await getProductsPage(filters, PAGE_SIZE, cursor);
      setProducts((prev) => [...prev, ...page.products]);
      setCursor(page.lastCursor);
      setHasMore(page.hasMore);
    } catch {
      setError(dict.product.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [filters, cursor, hasMore, isLoading, trimmedSearch, dict]);

  // 10,000+ mahsulot bo'lsa ham bir vaqtning o'zida faqat bitta sahifa
  // (limit: 24) xotirada bo'ladi - IntersectionObserver "sentinel" elementi
  // ko'rinishga yaqinlashganda keyingi sahifa so'raladi (Cheksiz skrolling).
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  if (error) {
    return <p className="py-12 text-center text-sm text-red-500">{error}</p>;
  }

  if (!isLoading && products.length === 0) {
    return <p className="py-12 text-center text-sm text-navy-300">{dict.product.empty}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {(isLoading || hasMore) && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {isLoading && <CircularProgress size={28} />}
        </div>
      )}
    </div>
  );
}
