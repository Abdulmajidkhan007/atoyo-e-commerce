import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendTopicMessage } from "@/lib/telegram/bot";
import { formatOrderMessage } from "@/lib/telegram/templates";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { isDiscountActive } from "@/lib/products/pricing";
import type { Product } from "@/types/product";
import type { Order, OrderItem, OrderLocation } from "@/types/order";

/** Buyurtmani qabul qilib bo'lmasa (zaxira yetmasa, mahsulot yo'q) - mijozga
 *  tushunarli sabab qaytarish uchun alohida xato turi. */
export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

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
  const db = getAdminDb();
  const now = Date.now();
  const paymentMethod = input.paymentMethod ?? "cash";
  const orderRef = db.collection("orders").doc();

  // ---- Narx va zaxira SERVERDA tekshiriladi ----
  // Client yuborgan narxga ishonilmaydi: har bir mahsulot bazadan qayta
  // o'qiladi, hozirgi haqiqiy narx olinadi va zaxira yetarliligi
  // tekshiriladi. Hammasi bitta tranzaksiyada - ikki mijoz oxirgi donani
  // bir vaqtda olib ketolmaydi.
  const { items, totalAmount } = await db.runTransaction(async (tx) => {
    const refs = input.items.map((i) => db.collection("products").doc(i.productId));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

    const verifiedItems: OrderItem[] = [];
    for (let i = 0; i < input.items.length; i += 1) {
      const requested = input.items[i]!;
      const snap = snaps[i]!;
      if (!snap.exists) {
        throw new OrderValidationError(`"${requested.name}" mahsuloti topilmadi.`);
      }
      const product = { id: snap.id, ...snap.data() } as Product;
      if (!product.isActive) {
        throw new OrderValidationError(`"${product.name}" hozir sotuvda yo'q.`);
      }
      if (product.stock < requested.quantity) {
        throw new OrderValidationError(
          `"${product.name}" zaxirasi yetarli emas (mavjud: ${product.stock} dona).`
        );
      }
      verifiedItems.push({
        productId: product.id,
        name: product.name,
        // Narx MIJOZDAN emas, bazadan - chegirma muddati ham tekshiriladi.
        price: isDiscountActive(product) ? product.discountPrice! : product.price,
        quantity: requested.quantity,
        thumbnailUrl: product.thumbnailUrl,
      });
    }

    const total = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Zaxira/salesCount va statistika - shu tranzaksiyada.
    for (let i = 0; i < verifiedItems.length; i += 1) {
      tx.update(refs[i]!, {
        stock: FieldValue.increment(-verifiedItems[i]!.quantity),
        salesCount: FieldValue.increment(verifiedItems[i]!.quantity),
      });
    }
    tx.set(
      db.collection("stats").doc("summary"),
      { totalOrders: FieldValue.increment(1), totalRevenue: FieldValue.increment(total) },
      { merge: true }
    );

    return { items: verifiedItems, totalAmount: total };
  });

  const order: Order = {
    id: orderRef.id,
    userId: input.userId ?? null,
    customerEmail: input.customerEmail ?? null,
    customerName: input.customerName,
    phoneNumber: input.phoneNumber,
    items,
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

  // Zaxira/statistika yuqoridagi tranzaksiyada allaqachon yangilangan.
  await orderRef.set(order);

  try {
    const sent = await sendTopicMessage("orders", formatOrderMessage(order), buildOrderActionKeyboard(order.id));
    await orderRef.update({ telegramMessageId: sent.message_id });
    order.telegramMessageId = sent.message_id;
  } catch (error) {
    console.error("Buyurtma xabarini Telegramga yuborishda xato:", error);
  }

  return order;
}
