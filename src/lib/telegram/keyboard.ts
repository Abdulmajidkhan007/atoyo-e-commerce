import "server-only";
import type { OrderStatusCallbackData } from "@/types/telegram";

interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

function encodeCallback(data: OrderStatusCallbackData): string {
  // Telegram callback_data 64 baytdan oshmasligi kerak - shuning uchun
  // to'liq JSON emas, ixcham pipe-delimited format ishlatiladi.
  return `os|${data.orderId}|${data.status}`;
}

export function decodeOrderStatusCallback(raw: string): OrderStatusCallbackData | null {
  const [tag, orderId, status] = raw.split("|");
  if (tag !== "os" || !orderId || !status) return null;
  if (!["approved", "delivering", "completed"].includes(status)) return null;

  return { action: "order_status", orderId, status: status as OrderStatusCallbackData["status"] };
}

export function buildOrderActionKeyboard(orderId: string) {
  const buttons: InlineKeyboardButton[] = [
    { text: "✅ Qabul qilish", callback_data: encodeCallback({ action: "order_status", orderId, status: "approved" }) },
    { text: "🚚 Yetkazishda", callback_data: encodeCallback({ action: "order_status", orderId, status: "delivering" }) },
    { text: "🎉 Yakunlandi", callback_data: encodeCallback({ action: "order_status", orderId, status: "completed" }) },
  ];

  return { inline_keyboard: [buttons] };
}

/**
 * O'TKAZMA CHEKI ostidagi tugmalar: admin pul tushganini bankda
 * ko'rib, bir bosishda tasdiqlaydi yoki rad etadi.
 * Format: `pay|<orderId>|ok` / `pay|<orderId>|no` (64 baytga sig'adi).
 */
export function buildPaymentReviewKeyboard(orderId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ To'lov keldi", callback_data: `pay|${orderId}|ok` },
        { text: "❌ Pul tushmadi", callback_data: `pay|${orderId}|no` },
      ],
    ],
  };
}

export function decodePaymentReviewCallback(raw: string): { orderId: string; paid: boolean } | null {
  const [tag, orderId, verdict] = raw.split("|");
  if (tag !== "pay" || !orderId || (verdict !== "ok" && verdict !== "no")) return null;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) return null;
  return { orderId, paid: verdict === "ok" };
}
