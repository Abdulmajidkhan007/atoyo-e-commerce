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
/**
 * O'XSHASH MAHSULOTLAR.
 *
 * Avval MAXSUS KALIT SO'Z bo'yicha - ular o'zaro almashtiriladigan
 * mahsulotlar (bir xil vazifadagi, boshqa brend/model). Mijoz qidirgan
 * mahsulot tugab qolsa yoki qimmat bo'lsa, aynan shular kerak bo'ladi.
 * Kalit topilmasa yoki kam bo'lsa - o'sha kategoriyadan to'ldiriladi.
 * Zaxirada BOR mahsulotlar oldinda turadi.
 */
export async function getRelatedProducts(product: Product, limitCount = 8): Promise<Product[]> {
  const db = getAdminDb();

  const byKeyword: Product[] = [];
  const keywords = (product.keywords ?? []).slice(0, 10);
  if (keywords.length > 0) {
    const snap = await db
      .collection("products")
      .where("isActive", "==", true)
      .where("keywords", "array-contains-any", keywords)
      .limit(limitCount * 2)
      .get()
      .catch(() => null);

    for (const doc of snap?.docs ?? []) {
      const item = { id: doc.id, ...doc.data() } as Product;
      if (item.id === product.id || item.isDraft) continue;
      byKeyword.push(item);
    }
    // Zaxirasi borlari oldinda, keyin ko'p sotilgani.
    byKeyword.sort(
      (a, b) =>
        Number(b.stock > 0) - Number(a.stock > 0) || (b.salesCount ?? 0) - (a.salesCount ?? 0)
    );
    if (byKeyword.length >= limitCount) return byKeyword.slice(0, limitCount);
  }

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

  const seen = new Set(byKeyword.map((item) => item.id));
  const byCategory = (snapshot?.docs ?? [])
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
    .filter((item) => item.id !== product.id && !item.isDraft && !seen.has(item.id));

  return [...byKeyword, ...byCategory].slice(0, limitCount);
}
