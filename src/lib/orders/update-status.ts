import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { editTopicMessageText, sendChatMessage } from "@/lib/telegram/bot";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { formatOrderMessage } from "@/lib/telegram/templates";
import type { Order, OrderStatus } from "@/types/order";

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

  const updatedOrder: Order = {
    ...(snapshot.data() as Order),
    status,
    updatedAt: Date.now(),
  };

  await orderRef.update({ status: updatedOrder.status, updatedAt: updatedOrder.updatedAt });

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

  // Buyurtma bot orqali berilgan bo'lsa, mijozga shaxsiy xabar yuboriladi.
  if (updatedOrder.customerChatId) {
    try {
      await sendChatMessage(
        updatedOrder.customerChatId,
        `📦 Buyurtmangiz <b>#${updatedOrder.id.slice(0, 8)}</b> holati: <b>${STATUS_DM_TEXT[updatedOrder.status]}</b>`
      );
    } catch (error) {
      console.error("Mijozga DM yuborishda xato:", error);
    }
  }

  return updatedOrder;
}
