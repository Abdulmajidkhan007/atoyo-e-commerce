import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { editTopicMessageText, sendChatMessage } from "@/lib/telegram/bot";
import { sendSlotSticker, slotForOrderStatus } from "@/lib/telegram/stickers";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { formatOrderMessage } from "@/lib/telegram/templates";
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
export async function applyOrderStatusUpdate(orderId: string, status: OrderStatus): Promise<Order | null> {
  const orderRef = getAdminDb().collection("orders").doc(orderId);
  const snapshot = await orderRef.get();

  if (!snapshot.exists) return null;

  const current = snapshot.data() as Order;
  const updatedOrder: Order = {
    ...current,
    status,
    updatedAt: Date.now(),
  };

  // Buyurtma BEKOR qilinganda mahsulotlar zaxirasi joyiga qaytariladi
  // (va salesCount kamaytiriladi) - lekin faqat BIR MARTA (`stockReturned`
  // bayrog'i orqali takroriy qaytarishning oldi olinadi).
  const shouldReturnStock = status === "cancelled" && !current.stockReturned;
  if (shouldReturnStock) {
    const batch = getAdminDb().batch();
    for (const item of current.items) {
      const productRef = getAdminDb().collection("products").doc(item.productId);
      batch.update(productRef, {
        stock: FieldValue.increment(item.quantity),
        salesCount: FieldValue.increment(-item.quantity),
      });
    }
    batch.set(
      getAdminDb().collection("stats").doc("summary"),
      {
        totalOrders: FieldValue.increment(-1),
        totalRevenue: FieldValue.increment(-current.totalAmount),
      },
      { merge: true }
    );
    batch.update(orderRef, { status, updatedAt: updatedOrder.updatedAt, stockReturned: true });
    await batch.commit();
    updatedOrder.stockReturned = true;

    // Ombor tarixi: zaxira qaytgani yozib qo'yiladi.
    await recordStockMoves(
      current.items.map((item) => ({
        productId: item.productId,
        productName: item.name,
        variantId: item.variantId ?? null,
        variantLabel: item.variantLabel ?? null,
        type: "return" as const,
        qty: item.quantity,
        stockBefore: 0,
        stockAfter: 0,
        refId: current.id,
        note: "Buyurtma bekor qilindi",
      }))
    );
  } else {
    await orderRef.update({ status: updatedOrder.status, updatedAt: updatedOrder.updatedAt });
  }

  if (updatedOrder.telegramMessageId) {
    try {
      // Buyurtma "Yakunlandi" holatiga o'tganda tugmalar olib tashlanadi,
      // aks holda admin keyingi bosqichga o'tishi uchun tugmalar qoladi.
      await editTopicMessageText(
        updatedOrder.telegramMessageId,
        formatOrderMessage(updatedOrder),
        updatedOrder.status === "completed" ? undefined : buildOrderActionKeyboard(updatedOrder.id)
      );
    } catch (error) {
      // Firestore statusi allaqachon yangilandi - Telegram xabari
      // tahrirlanmasa ham buyurtma holati to'g'ri qoladi, faqat log qilinadi.
      console.error("Telegram xabarini tahrirlashda xato:", error);
    }
  }

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
