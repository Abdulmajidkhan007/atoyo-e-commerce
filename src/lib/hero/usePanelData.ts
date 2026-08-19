"use client";

import { useEffect, useState } from "react";
import { useCategories } from "@/lib/products/useTaxonomy";
import { useDelivery } from "@/lib/delivery/useDelivery";
import { freeDeliveryShort } from "@/lib/delivery/text";
import { formatSom } from "@/lib/format";
import { effectivePrice } from "@/lib/products/pricing";
import { hasVariants, minVariantPrice } from "@/lib/products/variants";
import type { Product } from "@/types/product";

/**
 * HERO'DAGI SUZUVCHI PANELLARDAGI MA'LUMOT.
 *
 * Panellar BEZAK EMAS - ular haqiqiy ma'lumot ko'rsatadi:
 *   • katalogdagi kategoriyalar soni va nomlari;
 *   • sozlamadagi yetkazib berish va'dasi ("Qo'qon + 15 km - bepul");
 *   • vitrinadagi bitta mahsulot (nomi va DONA narxi).
 *
 * Shu sabab admin sozlamani o'zgartirsa yoki yangi kategoriya ochsa
 * hero ham o'zgaradi - "soxta" yozuv qolib ketmaydi.
 *
 * Ma'lumot kelmasa panel ATAYLAB standart matn bilan chiziladi:
 * sahna hech qachon bo'sh panel ko'rsatmaydi.
 */

export interface HeroPanel {
  /** Kichik sarlavha (masalan "YETKAZIB BERISH"). */
  label: string;
  /** Asosiy qiymat (masalan "Qo'qon + 15 km"). */
  value: string;
  /** Ixtiyoriy izoh (kichik shrift). */
  note?: string;
}

export interface HeroPanels {
  delivery: HeroPanel;
  catalog: HeroPanel;
  product: HeroPanel;
}

/** Vitrinadagi birinchi mahsulot (narxi bilan) - bo'lmasa `null`. */
function useShowcaseProduct(): Product | null {
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/products/showcase")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: Product[] } | null) => {
        const first = data?.products?.find((item) => item.thumbnailUrl) ?? data?.products?.[0];
        if (active && first) setProduct(first);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return product;
}

export function useHeroPanels(): HeroPanels {
  const categories = useCategories();
  const delivery = useDelivery();
  const product = useShowcaseProduct();

  const price = product
    ? formatSom(
        hasVariants(product) ? (minVariantPrice(product) ?? product.price) : effectivePrice(product)
      )
    : "";

  return {
    delivery: {
      label: "YETKAZIB BERISH",
      value: freeDeliveryShort(delivery),
      note: "Buyurtma bergan kuningiz",
    },
    catalog: {
      label: "KATALOG",
      value: categories.length > 0 ? `${categories.length} ta bo'lim` : "10 000+ mahsulot",
      note: categories
        .slice(0, 3)
        .map((item) => item.label)
        .join(" · "),
    },
    product: product
      ? { label: "VITRINADAN", value: product.name.slice(0, 28), note: price }
      : { label: "VITRINADAN", value: "Yangi mahsulotlar", note: "Har kuni to'ldiriladi" },
  };
}
