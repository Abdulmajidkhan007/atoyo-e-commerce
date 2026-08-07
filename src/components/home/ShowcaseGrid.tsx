"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeletons } from "@/components/product/ProductCardSkeleton";
import { useI18n } from "@/lib/i18n/LocaleContext";
import type { Product } from "@/types/product";

/**
 * BOSH SAHIFADAGI NAMUNA MAHSULOTLAR: 6 ta, har kategoriyadan bittadan.
 *
 * Katalog kattalashgach (3 000+ mahsulot) bosh sahifada uzun ro'yxat
 * chalg'itadi - mijoz nima sotilishini bir qarashda ko'rsin, keyin
 * katalogga o'tsin. Ro'yxatni server tayyorlaydi (`/api/products/showcase`).
 */
export function ShowcaseGrid() {
  const { dict } = useI18n();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/products/showcase")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: Product[] } | null) => {
        if (active) setProducts(data?.products ?? []);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Yuklanayotganda kartochka skeletlari - bosh sahifa "sakramaydi".
  if (products === null) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <ProductCardSkeletons count={6} />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button component={Link} href="/katalog" variant="outlined" size="large">
          {dict.home.viewCatalog}
        </Button>
      </div>
    </>
  );
}
