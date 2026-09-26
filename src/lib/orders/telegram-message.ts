import "server-only";
import { editTopicMessageText } from "@/lib/telegram/bot";
import { buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { formatOrderMessage } from "@/lib/telegram/templates";
import type { Order } from "@/types/order";

/**
 * GURUHDAGI BUYURTMA XABARINI YANGILASH — bitta joyda.
 *
 * Holat o'zgarganda (`update-status.ts`) ham, o'tkazma cheki/tasdig'ida
 * (`payment-transfer.ts`) ham xabar matni qayta chiziladi. Ilgari bu
 * mantiq (shu jumladan "Yakunlandi da tugmalar olib tashlanadi"
 * qoidasi) ikki joyda nusxa edi — loyihada nusxa tufayli ikki marta
 * nosozlik chiqqan.
 *
 * Xato bo'lsa faqat log: Firestore'dagi holat allaqachon to'g'ri,
 * Telegram xabari tahrirlanmay qolsa ham buyurtma buzilmaydi.
 */
export async function refreshOrderTelegramMessage(order: Order): Promise<void> {
  if (!order.telegramMessageId) return;
  try {
    await editTopicMessageText(
      order.telegramMessageId,
      formatOrderMessage(order),
      // Yakunlangan buyurtmada tugmalar kerak emas.
      order.status === "completed" ? undefined : buildOrderActionKeyboard(order.id)
    );
  } catch (error) {
    console.error("Telegram buyurtma xabarini tahrirlashda xato:", error);
  }
}
