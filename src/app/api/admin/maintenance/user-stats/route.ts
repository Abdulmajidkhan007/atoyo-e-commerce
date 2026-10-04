import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import { accumulateUserStats, type OrderForStats, type UserOrderStats } from "@/lib/orders/user-stats";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Bir so'rovda o'qiladigan hujjatlar soni (buyurtma ham, foydalanuvchi ham). */
const PAGE = 500;
/** Firestore batch chegarasi 500 - zaxira bilan. */
const BATCH_LIMIT = 400;

/**
 * BIR MARTALIK TO'LDIRISH (faqat loyiha egasi, Sozlamalardagi tugma).
 *
 * `users/{uid}.ordersCount / totalSpent / lastOrderAt` endi buyurtma
 * tranzaksiyasida yuritiladi (`lib/orders/user-stats.ts`). Bu maydonlar
 * paydo bo'lishidan OLDINGI buyurtmalar esa hisobga kirmagan - shu route
 * ularni bir marta hisoblab yozadi:
 *
 * 1. `orders` kursor bilan (500 tadan) aylanadi, faqat kerakli maydonlar
 *    tortiladi va xotirada foydalanuvchi bo'yicha yig'iladi
 *    (`accumulateUserStats` - increment mantiqi bilan BIR XIL qoida:
 *    bekor qilingani soniga/summasiga kirmaydi, qaytarilgani ayiriladi).
 * 2. `users` kursor bilan aylanadi va har biriga ANIQ qiymat yoziladi
 *    (buyurtmasi yo'qqa - 0). Mehmon buyurtmasi (`userId = null`) hech
 *    kimga yozilmaydi; o'chirilgan foydalanuvchining buyurtmasi ham.
 *
 * Idempotent: qiymat qayta hisoblanib USTIDAN yoziladi, takror bosish
 * zarari yo'q. Yagona nozik joy - ish davomida tushgan yangi buyurtma
 * (uning increment'i ustidan yozilib ketishi mumkin); kam band paytda
 * bosing yoki keyin yana bir marta bosing.
 */
export async function POST() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Bu amalni faqat loyiha egasi bajara oladi." }, { status: 403 });
  }

  const db = getAdminDb();

  // ---- 1. Buyurtmalarni yig'ish ----
  const stats = new Map<string, UserOrderStats>();
  let ordersScanned = 0;
  let orderCursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db
      .collection("orders")
      .orderBy("__name__")
      .select("userId", "totalAmount", "refundAmount", "createdAt", "status", "stockReturned", "userStatsCounted")
      .limit(PAGE);
    if (orderCursor) query = query.startAfter(orderCursor);
    const page = await query.get();
    if (page.empty) break;
    for (const doc of page.docs) {
      ordersScanned += 1;
      accumulateUserStats(stats, doc.data() as OrderForStats);
    }
    orderCursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE) break;
  }

  // ---- 2. Foydalanuvchilarga yozish ----
  let usersUpdated = 0;
  let batch = db.batch();
  let pending = 0;
  let userCursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection("users").orderBy("__name__").select().limit(PAGE);
    if (userCursor) query = query.startAfter(userCursor);
    const page = await query.get();
    if (page.empty) break;
    for (const doc of page.docs) {
      const value = stats.get(doc.id) ?? { ordersCount: 0, totalSpent: 0, lastOrderAt: null };
      batch.update(doc.ref, { ...value });
      pending += 1;
      usersUpdated += 1;
      if (pending >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
    userCursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE) break;
  }
  if (pending > 0) await batch.commit();

  await logAction(
    `🔧 Foydalanuvchi statistikasi to'ldirildi (${owner.email ?? owner.uid}): ` +
      `${ordersScanned} buyurtma, ${usersUpdated} foydalanuvchi`
  );

  return NextResponse.json({ ok: true, ordersScanned, usersUpdated, usersWithOrders: stats.size });
}
