import "server-only";
import { getAdminDb } from "./admin";
import type { Product } from "@/types/product";

/**
 * Mahsulot sahifasini server tomonida (SEO va tezkor birinchi render
 * uchun) Admin SDK bilan o'qiydi. Mahsulotlar ochiq o'qish uchun
 * (`firestore.rules`da `allow read: if true`) ruxsat etilgan, shuning
 * uchun Admin SDK'dan foydalanish xavfsizlik qoidalarini chetlab
 * o'tmaydi - shunchaki server-side so'rovni soddalashtiradi.
 */
export async function getProductById(id: string): Promise<Product | null> {
  const snapshot = await getAdminDb().collection("products").doc(id).get();
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...snapshot.data() } as Product;
}

/**
 * O'XSHASH MAHSULOTLAR - mahsulot sahifasining pastida chiqadi.
 *
 * Avval shu kategoriyadagi mahsulotlar olinadi (eng ko'p sotilgani
 * oldinda), o'zi ro'yxatdan chiqarib tashlanadi. Kompozit indeks
 * bo'lmasa - faqat kategoriya bo'yicha oddiy so'rovga tushamiz.
 */
export async function getRelatedProducts(product: Product, limitCount = 8): Promise<Product[]> {
  const db = getAdminDb();

  const query = db
    .collection("products")
    .where("isActive", "==", true)
    .where("category", "==", product.category);

  const snapshot =
    (await query
      .orderBy("salesCount", "desc")
      .limit(limitCount + 1)
      .get()
      .catch(() => null)) ?? (await query.limit(limitCount + 1).get().catch(() => null));

  return (snapshot?.docs ?? [])
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
    .filter((item) => item.id !== product.id && !item.isDraft)
    .slice(0, limitCount);
}
