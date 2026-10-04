import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendChatMessage } from "@/lib/telegram/bot";
import { refreshOrderTelegramMessage } from "./telegram-message";
import { sendSlotSticker, slotForOrderStatus } from "@/lib/telegram/stickers";
import { sendOrderStatusEmail } from "@/lib/email/mailer";
import { sendPushToUser } from "@/lib/notifications/push";
import type { Order, OrderStatus } from "@/types/order";
import type { AppUser } from "@/types/user";
import { recordStockMoves } from "@/lib/inventory/stock-moves";
import { sendSms, isSmsConfigured } from "@/lib/sms/sender";

/** SMS uchun qisqa, emojisiz matn (operator emojini kesib tashlaydi). */
const SMS_STATUS_TEXT: Record<OrderStatus, string> = {
  pending: "qabul qilindi, tez orada bog'lanamiz",
  approved: "tasdiqlandi",
  delivering: "yetkazilmoqda",
  completed: "yakunlandi. Xaridingiz uchun rahmat!",
  cancelled: "bekor qilindi",
};

const STATUS_DM_TEXT: Record<OrderStatus, string> = {
  pending: "🕓 kutilmoqda",
  approved: "✅ qabul qilindi",
  delivering: "🚚 yetkazilmoqda",
  completed: "🎉 yakunlandi",
  cancelled: "❌ bekor qilindi",
};

/**
 * Buyurtma statusini Firestore'da yangilaydi va (agar mavjud bo'lsa)
 * Telegram guruhidagi asl xabarni yangi holat bilan tahrirlaydi. Bu
 * yagona joy - Telegram bot tugmalaridan (`/api/telegram-webhook`) ham,
 * admin paneldan qo'lda (`/api/admin/orders/[id]/status`) ham xuddi shu
 * funksiya chaqiriladi, ikkala joyda mantiqni takrorlamaslik uchun.
 */
/** Shu qator bo'yicha oldin qaytarilgan dona (`orders/[id]/return`). */
function returnedQty(order: Order, productId: string, variantId: string | null): number {
  return (order.returnedItems ?? [])
    .filter((row) => row.productId === productId && (row.variantId ?? null) === variantId)
    .reduce((sum, row) => sum + row.quantity, 0);
}

export async function applyOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<Order | null> {
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(orderId);
  const now = Date.now();

  // BEKOR QILISH — TRANZAKSIYADA. Bir buyurtmani bir vaqtda mijoz,
  // Payme/Click va admin bot bekor qilishi mumkin: ilgari `stockReturned`
  // tranzaksiyadan tashqarida o'qilardi va zaxira/statistika IKKI marta
  // qaytishi mumkin edi. Endi o'qish, tekshiruv va yozuv bitta
  // tranzaksiyada (o'qishlar yozuvlardan OLDIN).
  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(orderRef);
    if (!snapshot.exists) return null;
    const current = snapshot.data() as Order;
    const shouldReturnStock = status === "cancelled" && !current.stockReturned;

    if (!shouldReturnStock) {
      tx.update(orderRef, { status, updatedAt: now });
      return { current, returned: false };
    }

    // Foydalanuvchi statistikasi (`user-stats.ts`): faqat yaratilganda
    // QO'SHILGAN bo'lsa ayiriladi; qaytarilgan qismi allaqachon ayirilgan.
    const countedForUser = Boolean(current.userId) && current.userStatsCounted !== false;
    const userRef = countedForUser ? db.collection("users").doc(current.userId!) : null;
    const userSnap = userRef ? await tx.get(userRef) : null;

    if (userRef && userSnap?.exists) {
      tx.update(userRef, {
        ordersCount: FieldValue.increment(-1),
        totalSpent: FieldValue.increment(-(current.totalAmount - (current.refundAmount ?? 0))),
      });
    }
    // Qisman QAYTARILGAN qatorlar zaxiraga allaqachon qaytgan — faqat
    // qolgan dona qaytadi (aks holda zaxira ikki marta ko'payardi).
    for (const item of current.items) {
      const qty = item.quantity - returnedQty(current, item.productId, item.variantId ?? null);
      if (qty <= 0) continue;
      tx.update(db.collection("products").doc(item.productId), {
        stock: FieldValue.increment(qty),
        salesCount: FieldValue.increment(-qty),
      });
    }
    tx.set(
      db.collection("stats").doc("summary"),
      {
        totalOrders: FieldValue.increment(-1),
        totalRevenue: FieldValue.increment(-(current.totalAmount - (current.refundAmount ?? 0))),
      },
      { merge: true }
    );
    tx.update(orderRef, { status, updatedAt: now, stockReturned: true });
    return { current, returned: true };
  });

  if (!result) return null;
  const { current } = result;
  const updatedOrder: Order = { ...current, status, updatedAt: now };

  if (result.returned) {
    updatedOrder.stockReturned = true;

    // Ombor tarixi: zaxira qaytgani yozib qo'yiladi.
    await recordStockMoves(
      current.items
        .map((item) => ({ item, qty: item.quantity - returnedQty(current, item.productId, item.variantId ?? null) }))
        .filter(({ qty }) => qty > 0)
        .map(({ item, qty }) => ({
        productId: item.productId,
        productName: item.name,
        variantId: item.variantId ?? null,
        variantLabel: item.variantLabel ?? null,
        type: "return" as const,
        qty,
        stockBefore: 0,
        stockAfter: 0,
        refId: current.id,
        note: "Buyurtma bekor qilindi",
      }))
    );
  }

  await refreshOrderTelegramMessage(updatedOrder);

  // Mijozga Telegram DM.
  //
  // Buyurtma bot orqali berilgan bo'lsa - chat ID buyurtmada turadi.
  // Sayt yoki ilovadan berilgan bo'lsa ham, mijoz hisobini Telegram
  // bilan bog'lagan bo'lsa (`users/{uid}.telegramId`) xabar shu yerga
  // boradi - SMS sozlanmagan paytda eng ishonchli kanal shu.
  const telegramChatId =
    updatedOrder.customerChatId ??
    (updatedOrder.userId
      ? await getAdminDb()
          .collection("users")
          .doc(updatedOrder.userId)
          .get()
          .then((snap) => (snap.data() as AppUser | undefined)?.telegramId ?? null)
          .catch(() => null)
      : null);

  if (telegramChatId) {
    try {
      // Holatga mos stiker (sozlangan bo'lsa) - xabardan oldin.
      const slot = slotForOrderStatus(updatedOrder.status);
      if (slot) await sendSlotSticker(telegramChatId, slot);
      await sendChatMessage(
        telegramChatId,
        `📦 Buyurtmangiz <b>#${updatedOrder.id.slice(0, 8)}</b> holati: <b>${STATUS_DM_TEXT[updatedOrder.status]}</b>`
      );
    } catch (error) {
      console.error("Mijozga DM yuborishda xato:", error);
    }
  }

  // Sayt orqali berilgan buyurtmada mijoz emailiga xabarnoma (best-effort;
  // SMTP sozlanmagan bo'lsa mailer o'zi jim o'tadi) va mobil ilovaga push.
  if (updatedOrder.userId) {
    try {
      const userSnap = await getAdminDb().collection("users").doc(updatedOrder.userId).get();
      const email = (userSnap.data() as AppUser | undefined)?.email;
      if (email) await sendOrderStatusEmail(email, updatedOrder, status);
    } catch (error) {
      console.error("Email xabarnoma xatosi:", error);
    }

    await sendPushToUser(updatedOrder.userId, {
      title: `Buyurtma #${updatedOrder.id.slice(0, 8)}`,
      body: `Holati: ${STATUS_DM_TEXT[updatedOrder.status]}`,
      data: { screen: "Buyurtmalarim", orderId: updatedOrder.id },
    });
  }

  // SMS - eng ishonchli kanal: mijozda ilova ham, Telegram ham
  // bo'lmasligi mumkin. Sozlanmagan bo'lsa jimgina o'tadi.
  if (isSmsConfigured() && updatedOrder.phoneNumber) {
    const shortId = updatedOrder.id.slice(0, 8);
    await sendSms(
      updatedOrder.phoneNumber,
      `Atoyo: buyurtmangiz #${shortId} — ${SMS_STATUS_TEXT[updatedOrder.status]}. Savol: atoyo.uz`
    );
  }

  return updatedOrder;
}
