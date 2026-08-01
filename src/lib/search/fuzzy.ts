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
    keys: ["name", "brand", "sku"],
    threshold: 0.35, // 0 = aniq mos kelish, 1 = juda erkin
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return (term: string): Product[] => {
    const words = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return products;

    /**
     * 1-BOSQICH: har bir so'z mahsulot ma'lumotida bormi (tartibi muhim
     * emas). "8276 dush" ham, "dush 8276" ham "Boou dush 8276" ni topadi -
     * Fuse butun iborani bir butun deb qidirgani uchun bunday teskari
     * tartibdagi so'rovlarni tashlab yuborardi.
     */
    const exact = products.filter((product) => {
      const haystack = [product.name, product.brand, product.sku, product.code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
    if (exact.length > 0) return exact;

    // 2-BOSQICH: aniq mos kelmasa - xatoga chidamli (typo) qidiruv.
    return fuse.search(term).map((result) => result.item);
  };
}
