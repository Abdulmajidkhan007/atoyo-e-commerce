import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatOrderMessage } from "@/lib/telegram/templates";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { getCurrentAppUser } from "@/lib/firebase/session";
import type { Order } from "@/types/order";

const orderSchema = z.object({
  customerName: z.string().min(2).max(120),
  phoneNumber: z.string().min(7).max(20),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        name: z.string().min(1),
        price: z.number().nonnegative(),
        quantity: z.number().int().positive(),
        thumbnailUrl: z.string(),
      })
    )
    .min(1),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Buyurtma ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const currentUser = await getCurrentAppUser();
  const { customerName, phoneNumber, items, location } = parsed.data;
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const now = Date.now();

  const orderRef = getAdminDb().collection("orders").doc();
  const order: Order = {
    id: orderRef.id,
    userId: currentUser?.uid ?? null,
    customerName,
    phoneNumber,
    items,
    totalAmount,
    currency: "UZS",
    location: location ?? null,
    status: "pending",
    telegramMessageId: null,
    createdAt: now,
    updatedAt: now,
  };

  await orderRef.set(order);

  // Zaxirani kamaytirish, "eng ko'p sotilgan" tahlili uchun salesCount'ni
  // oshirish va admin dashboard tahlillari uchun `stats/summary`
  // hujjatidagi umumiy son/tushumni yangilash - bitta batch ichida,
  // atomik ravishda. `stats/summary` orqali dashboard har safar
  // buyurtmalar kolleksiyasini yig'ishtirmasdan, bitta hujjatni o'qib
  // umumiy ko'rsatkichlarni oladi (O(1) o'qish, 10,000+ buyurtma
  // bo'lsa ham tez).
  const statsBatch = getAdminDb().batch();
  for (const item of items) {
    const productRef = getAdminDb().collection("products").doc(item.productId);
    statsBatch.update(productRef, {
      stock: FieldValue.increment(-item.quantity),
      salesCount: FieldValue.increment(item.quantity),
    });
  }
  statsBatch.set(
    getAdminDb().collection("stats").doc("summary"),
    { totalOrders: FieldValue.increment(1), totalRevenue: FieldValue.increment(totalAmount) },
    { merge: true }
  );
  await statsBatch.commit();

  try {
    const sent = await sendTopicMessage(
      "orders",
      formatOrderMessage(order),
      buildOrderActionKeyboard(order.id)
    );
    await orderRef.update({ telegramMessageId: sent.message_id });
  } catch (error) {
    // Buyurtma Firestore'da saqlanib bo'ldi - Telegram xabari yuborilmasa
    // ham buyurtma yo'qolmaydi, faqat log qilinadi.
    console.error("Telegram xabarini yuborishda xato:", error);
  }

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
