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
