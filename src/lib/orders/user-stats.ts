/**
 * FOYDALANUVCHI HUJJATIDAGI BUYURTMA STATISTIKASI
 * (`users/{uid}.ordersCount`, `totalSpent`, `lastOrderAt`).
 *
 * Ilgari admin "Foydalanuvchilar" ro'yxati har sahifada HAR BIR
 * foydalanuvchi uchun `orders` ga alohida so'rov yuborardi (1 + 20
 * so'rov, 4000 tagacha hujjat o'qish, AUDIT 3.4). Endi qiymatlar
 * foydalanuvchi hujjatining o'zida yuritiladi:
 *
 * - **Yangi buyurtma** (`create-order.ts`, o'sha tranzaksiyada):
 *   `ordersCount +1`, `totalSpent +totalAmount`, `lastOrderAt = createdAt`.
 * - **Bekor qilish** (`update-status.ts`, zaxira qaytgan payt — BIR
 *   MARTA, `stockReturned` bayrog'i bilan): `ordersCount -1`,
 *   `totalSpent -totalAmount`. Ya'ni bekor qilingan buyurtma
 *   foydalanuvchining soni va summasiga KIRMAYDI — `stats/summary`
 *   bilan bir xil qoida.
 * - **Qaytarish** (`orders/[id]/return`): `totalSpent -refundAmount`
 *   (buyurtma soni o'zgarmaydi — buyurtma bo'lgan, qisman qaytgan).
 * - `lastOrderAt` bekor qilinganda O'ZGARMAYDI: u "oxirgi marta qachon
 *   buyurtma bergan" — faollik belgisi, bekor qilingani ham faollik.
 *
 * Mehmon (`userId = null`) buyurtmasi hech kimning hujjatiga yozilmaydi.
 * Hujjati yo'q foydalanuvchiga ham yozilmaydi (bo'sh "skelet" hujjat
 * yaratib qo'ymaslik uchun) — chaqiruvchi avval mavjudligini tekshiradi.
 *
 * Mijoz bu maydonlarni o'zi o'zgartira olmaydi — `firestore.rules`
 * (`users/{userId}`) ularni create/update'da taqiqlaydi.
 */

export const USER_STATS_FIELDS = ["ordersCount", "totalSpent", "lastOrderAt"] as const;

export interface UserOrderStats {
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: number | null;
}

/** Bir martalik to'ldirish (`/api/admin/maintenance/user-stats`) uchun
 *  buyurtmaning kerakli qismi. */
export interface OrderForStats {
  userId?: string | null;
  totalAmount?: number;
  refundAmount?: number;
  createdAt?: number;
  status?: string;
  stockReturned?: boolean;
}

/**
 * Buyurtma bekor qilinib, statistikadan AYIRILGANMI? Bekor qilishda
 * ayirish `stockReturned` bilan birga bo'ladi (`update-status.ts`),
 * shuning uchun to'ldirish ham aynan shu belgiga qaraydi — aks holda
 * qo'lda hisoblangan qiymat keyingi increment'lar bilan mos kelmasdi.
 */
export function isCancelledForStats(order: OrderForStats): boolean {
  return order.status === "cancelled" && order.stockReturned === true;
}

/**
 * Buyurtmalardan foydalanuvchi bo'yicha statistikani yig'adi (sof
 * funksiya). Natija increment mantiqi bilan bir xil:
 * bekor qilingani soniga/summasiga kirmaydi, lekin `lastOrderAt` ga
 * kiradi; qaytarilgan summa `totalSpent` dan ayiriladi.
 */
export function accumulateUserStats(
  acc: Map<string, UserOrderStats>,
  order: OrderForStats
): Map<string, UserOrderStats> {
  if (!order.userId) return acc;
  const stats = acc.get(order.userId) ?? { ordersCount: 0, totalSpent: 0, lastOrderAt: null };
  if (!isCancelledForStats(order)) {
    stats.ordersCount += 1;
    stats.totalSpent += (order.totalAmount ?? 0) - (order.refundAmount ?? 0);
  }
  if (order.createdAt && (stats.lastOrderAt === null || order.createdAt > stats.lastOrderAt)) {
    stats.lastOrderAt = order.createdAt;
  }
  acc.set(order.userId, stats);
  return acc;
}
