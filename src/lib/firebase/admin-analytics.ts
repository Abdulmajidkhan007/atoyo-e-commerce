import "server-only";
import { getAdminDb } from "./admin";
import type { Product } from "@/types/product";

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
}

/**
 * `stats/summary` hujjati har bir buyurtma yaratilganda
 * (`/api/orders`) `FieldValue.increment()` bilan yangilanadi - shuning
 * uchun dashboard butun `orders` kolleksiyasini yig'ishtirmasdan,
 * bitta hujjatni o'qib umumiy ko'rsatkichlarni oladi.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const snapshot = await getAdminDb().collection("stats").doc("summary").get();
  const data = snapshot.data();
  return {
    totalOrders: data?.totalOrders ?? 0,
    totalRevenue: data?.totalRevenue ?? 0,
  };
}

export async function getTopSellingProducts(limitCount = 5): Promise<Product[]> {
  const snapshot = await getAdminDb()
    .collection("products")
    .where("isActive", "==", true)
    .orderBy("salesCount", "desc")
    .limit(limitCount)
    .get();

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
}
