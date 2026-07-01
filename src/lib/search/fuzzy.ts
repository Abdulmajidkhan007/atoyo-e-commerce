import Fuse from "fuse.js";
import type { Product } from "@/types/product";

/**
 * Har bir harf bosilganda ishlaydigan typo-tolerant qidiruv.
 *
 * Eslatma (masshtablash haqida): Fuse.js xotiradagi ro'yxat ustida ishlaydi,
 * shuning uchun bu funksiya faqat Firestore'dan cursor-based tarzda
 * allaqachon yuklab olingan "joriy oyna" (masalan oxirgi 200-500 ta
 * mahsulot yoki tanlangan kategoriya) ustida chaqirilishi kerak - butun
 * 10,000+ mahsulotni bir vaqtda xotiraga yuklamang. Agar butun katalog
 * bo'yicha to'liq fuzzy qidiruv kerak bo'lsa, Algolia/Typesense/Meilisearch
 * kabi maxsus qidiruv indeksidan foydalanish tavsiya etiladi (Firestore
 * Cloud Function trigger orqali sinxronlanadi).
 */
export function createFuzzySearcher(products: Product[]) {
  const fuse = new Fuse(products, {
    keys: ["name", "brand"],
    threshold: 0.35, // 0 = aniq mos kelish, 1 = juda erkin
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return (term: string): Product[] => {
    if (!term.trim()) return products;
    return fuse.search(term).map((result) => result.item);
  };
}
