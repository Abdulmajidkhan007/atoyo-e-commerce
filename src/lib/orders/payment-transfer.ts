import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { savePrivateFile } from "@/lib/firebase/admin-storage";
import { editTopicMessageText, sendTopicFile } from "@/lib/telegram/bot";
import { buildOrderActionKeyboard, buildPaymentReviewKeyboard } from "@/lib/telegram/keyboard";
import { formatOrderMessage } from "@/lib/telegram/templates";
import { escapeHtml } from "@/lib/telegram/html";
import { logAction } from "@/lib/telegram/action-log";
import { isSmsConfigured, sendSms } from "@/lib/sms/sender";
import { formatSom } from "@/lib/format";
import { detectReceiptType, MAX_RECEIPT_BYTES } from "./receipt";
import type { Order } from "@/types/order";

/**
 * KARTAGA O'TKAZMA: CHEK VA TASDIQ.
 *
 * Oqim:
 *   1. Mijoz buyurtma beradi (`paymentMethod: "transfer"`), sahifada
 *      do'kon kartasi va summani ko'radi, bank ilovasida o'tkazadi.
 *   2. Chek skrinshotini yuklaydi → `attachReceipt`: fayl Storage'ga
 *      OCHIQ HAVOLASIZ yoziladi, guruhning "Buyurtmalar" topic'iga
 *      faylning o'zi + "✅ To'lov keldi / ❌ Pul tushmadi" tugmalari.
 *   3. Admin bankda pul tushganini ko'rib bosadi → `reviewTransferPayment`.
 *
 * Telegram yoki SMS ishlamasa ham chek va holat bazada saqlanadi —
 * admin paneldan ko'riladi (best-effort xabarlar).
 */

export class ReceiptError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ReceiptError";
  }
}

async function refreshOrderMessage(order: Order): Promise<void> {
  if (!order.telegramMessageId) return;
  try {
    await editTopicMessageText(
      order.telegramMessageId,
      formatOrderMessage(order),
      order.status === "completed" ? undefined : buildOrderActionKeyboard(order.id)
    );
  } catch (error) {
    // "message is not modified" va shunga o'xshash - holat bazada bor.
    console.error("Buyurtma xabarini yangilab bo'lmadi:", error);
  }
}

export async function attachReceipt(orderId: string, bytes: Buffer): Promise<Order> {
  if (bytes.length === 0) throw new ReceiptError("Fayl bo'sh.");
  if (bytes.length > MAX_RECEIPT_BYTES) throw new ReceiptError("Fayl 8 MB dan oshmasin.");
  const type = detectReceiptType(bytes);
  if (!type) throw new ReceiptError("Faqat rasm (JPG, PNG, WebP) yoki PDF chek qabul qilinadi.");

  const ref = getAdminDb().collection("orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new ReceiptError("Buyurtma topilmadi.", 404);
  const order = { id: snap.id, ...snap.data() } as Order;

  if (order.paymentMethod !== "transfer") throw new ReceiptError("Bu buyurtma o'tkazma bilan to'lanmaydi.", 409);
  if (order.status === "cancelled") throw new ReceiptError("Buyurtma bekor qilingan.", 409);
  if (order.paymentStatus === "paid") throw new ReceiptError("To'lov allaqachon tasdiqlangan.", 409);

  const uploadedAt = Date.now();
  // Eski chek O'CHIRILMAYDI - qayta yuklansa ham iz qoladi (nizo bo'lsa kerak).
  const path = `receipts/${orderId}/${uploadedAt}.${type.ext}`;
  await savePrivateFile(path, bytes, type.contentType);

  const receipt = { path, contentType: type.contentType, size: bytes.length, uploadedAt };
  // Admin avval "pul tushmadi" degan bo'lsa - yangi chek bilan qayta tekshiruvga.
  await ref.update({ receipt, paymentStatus: "pending", updatedAt: uploadedAt });
  const updated: Order = { ...order, receipt, paymentStatus: "pending", updatedAt: uploadedAt };

  await refreshOrderMessage(updated);
  try {
    await sendTopicFile({
      topicKey: "orders",
      file: { buffer: bytes, fileName: `chek-${orderId.slice(0, 8)}.${type.ext}`, contentType: type.contentType },
      caption: [
        `🧾 <b>Chek yuklandi — #${orderId.slice(0, 8)}</b>`,
        `💰 Kutilgan summa: <b>${formatSom(order.totalAmount)}</b>`,
        `👤 ${escapeHtml(order.customerName)} · ${escapeHtml(order.phoneNumber)}`,
        ``,
        `Bankda pul tushganini tekshirib, tugmani bosing.`,
      ].join("\n"),
      replyMarkup: buildPaymentReviewKeyboard(orderId),
      replyTo: order.telegramMessageId,
    });
  } catch (error) {
    console.error("Chekni guruhga yuborib bo'lmadi:", error);
  }
  return updated;
}

/**
 * Admin tasdig'i. `paid: true` — pul keldi, `false` — tushmadi (mijoz
 * yangi chek yuklashi mumkin). Tasdiqlangan to'lovni "tushmadi"ga
 * qaytarish mumkin EMAS — xato bosilsa admin panelda qo'lda tuzatiladi.
 */
export async function reviewTransferPayment(orderId: string, paid: boolean, who: string): Promise<Order | null> {
  const ref = getAdminDb().collection("orders").doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const order = { id: snap.id, ...snap.data() } as Order;
  if (order.paymentMethod !== "transfer" || order.paymentStatus === "paid") return order;

  const paymentStatus: Order["paymentStatus"] = paid ? "paid" : "failed";
  const now = Date.now();
  await ref.update({ paymentStatus, updatedAt: now });
  const updated: Order = { ...order, paymentStatus, updatedAt: now };

  await refreshOrderMessage(updated);
  await logAction(
    `${paid ? "✅ To'lov tasdiqlandi" : "❌ To'lov topilmadi"} — #${orderId.slice(0, 8)}, ${formatSom(order.totalAmount)} (${escapeHtml(who)})`
  ).catch(() => {});

  if (isSmsConfigured()) {
    const text = paid
      ? `Atoyo: ${formatSom(order.totalAmount)} to'lovingiz qabul qilindi. Buyurtma #${orderId.slice(0, 8)} tayyorlanmoqda.`
      : `Atoyo: buyurtma #${orderId.slice(0, 8)} bo'yicha to'lov topilmadi. Chekni qayta yuboring yoki bizga qo'ng'iroq qiling.`;
    await sendSms(order.phoneNumber, text).catch(() => false);
  }
  return updated;
}
