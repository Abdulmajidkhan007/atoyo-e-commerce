import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatOrderMessage } from "@/lib/telegram/templates";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import type { Order, OrderItem, OrderLocation } from "@/types/order";

export interface NewOrderInput {
  customerName: string;
  phoneNumber: string;
  items: OrderItem[];
  location?: OrderLocation | null;
  deliveryAddress?: string | null;
  paymentMethod?: "cash" | "online";
  userId?: string | null;
  customerEmail?: string | null;
  /** Buyurtma Telegram botdan kelgan bo'lsa - mijozning chat ID'si. */
  customerChatId?: number | null;
}

/**
 * Buyurtma yaratishning YAGONA yo'li - sayt (/api/orders) ham, Telegram
 * bot ham shu funksiyani chaqiradi, shunda zaxira/statistika/xabar
 * mantiqlari hech qachon bir-biridan chetga chiqmaydi.
 *
 * Qiladi: buyurtmani saqlaydi, zaxira/salesCount/stats ni atomik batch'da
 * yangilaydi, guruhning #Buyurtmalar topic'iga tugmali xabar yuboradi.
 * Telegram yuborilmasa buyurtma baribir saqlangan bo'ladi (best-effort).
 */
export async function createOrder(input: NewOrderInput): Promise<Order> {
  const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const now = Date.now();

  const paymentMethod = input.paymentMethod ?? "cash";
  const orderRef = getAdminDb().collection("orders").doc();
  const order: Order = {
    id: orderRef.id,
    userId: input.userId ?? null,
    customerEmail: input.customerEmail ?? null,
    customerName: input.customerName,
    phoneNumber: input.phoneNumber,
    items: input.items,
    totalAmount,
    currency: "UZS",
    location: input.location ?? null,
    deliveryAddress: input.deliveryAddress ?? null,
    paymentMethod,
    paymentStatus: paymentMethod === "online" ? "pending" : "not_required",
    status: "pending",
    stockReturned: false,
    telegramMessageId: null,
    customerChatId: input.customerChatId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await orderRef.set(order);

  // Zaxirani kamaytirish, "eng ko'p sotilgan" (salesCount) va dashboard
  // statistikasi (stats/summary) - bitta atomik batch'da.
  const statsBatch = getAdminDb().batch();
  for (const item of input.items) {
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
    const sent = await sendTopicMessage("orders", formatOrderMessage(order), buildOrderActionKeyboard(order.id));
    await orderRef.update({ telegramMessageId: sent.message_id });
    order.telegramMessageId = sent.message_id;
  } catch (error) {
    console.error("Buyurtma xabarini Telegramga yuborishda xato:", error);
  }

  return order;
}
