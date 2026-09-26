import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { deletePrivateFile, savePrivateFile } from "@/lib/firebase/admin-storage";
import { sendTopicFile } from "@/lib/telegram/bot";
import { buildPaymentReviewKeyboard } from "@/lib/telegram/keyboard";
import { reportError } from "@/lib/ops/report-error";
import { refreshOrderTelegramMessage } from "./telegram-message";
import { escapeHtml } from "@/lib/telegram/html";
import { logAction } from "@/lib/telegram/action-log";
import { isSmsConfigured, sendSms } from "@/lib/sms/sender";
import { formatSom } from "@/lib/format";
import { detectReceiptType, MAX_RECEIPT_BYTES, MAX_RECEIPTS_PER_ORDER } from "./receipt";
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

/**
 * Chekni guruhga yuborish. `sendPhoto` ba'zi rasmlarni rad etadi
 * (masalan juda uzun skroll-skrinshot) — shunda HUJJAT sifatida qayta
 * yuboriladi. Ikkalasi ham o'tmasa — `reportError` (tekshiruvchi D4):
 * aks holda mijozga "yuklandi" deyilardi, admin esa chekni ham,
 * tugmalarni ham ko'rmasdi.
 */
async function sendReceiptToGroup(order: Order, bytes: Buffer, type: { contentType: string; ext: string }) {
  const file = { buffer: bytes, fileName: `chek-${order.id.slice(0, 8)}.${type.ext}`, contentType: type.contentType };
  const message = {
    topicKey: "orders" as const,
    file,
    caption: [
      `🧾 <b>Chek yuklandi — #${order.id.slice(0, 8)}</b>`,
      `💰 Kutilgan summa: <b>${formatSom(order.totalAmount)}</b>`,
      `👤 ${escapeHtml(order.customerName)} · ${escapeHtml(order.phoneNumber)}`,
      ``,
      `Bankda pul tushganini tekshirib, tugmani bosing.`,
    ].join("\n"),
    replyMarkup: buildPaymentReviewKeyboard(order.id),
    replyTo: order.telegramMessageId,
  };
  try {
    await sendTopicFile(message);
    return;
  } catch (firstError) {
    if (type.contentType.startsWith("image/")) {
      try {
        await sendTopicFile({ ...message, asDocument: true });
        return;
      } catch {
        // Pastda umumiy xabar.
      }
    }
    await reportError("chek guruhga yuborilmadi", firstError, {
      buyurtma: order.id,
      yechim: "Admin → Buyurtmalar → \"To'lov chekini ko'rish\"",
    });
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

  const assertUploadable = (current: Order) => {
    if (current.paymentMethod !== "transfer") throw new ReceiptError("Bu buyurtma o'tkazma bilan to'lanmaydi.", 409);
    if (current.status === "cancelled") throw new ReceiptError("Buyurtma bekor qilingan.", 409);
    if (current.paymentStatus === "paid") throw new ReceiptError("To'lov allaqachon tasdiqlangan.", 409);
    if ((current.receiptCount ?? 0) >= MAX_RECEIPTS_PER_ORDER) {
      throw new ReceiptError("Bu buyurtmaga cheklar soni tugadi. Iltimos, bizga qo'ng'iroq qiling.", 429);
    }
  };
  // Arzon tekshiruv FAYLNI saqlashdan OLDIN (keraksiz yozuv bo'lmasin).
  assertUploadable(order);

  const uploadedAt = Date.now();
  // Eski chek O'CHIRILMAYDI - qayta yuklansa ham iz qoladi (nizo bo'lsa kerak).
  const path = `receipts/${orderId}/${uploadedAt}.${type.ext}`;
  await savePrivateFile(path, bytes, type.contentType);

  const receipt = { path, contentType: type.contentType, size: bytes.length, uploadedAt };

  /**
   * POYGA HOLATI (tekshiruvchi topgan): fayl yuklanayotgan bir necha
   * soniya ichida admin "To'lov keldi" ni bosishi mumkin. Ilgari
   * yakuniy yozuv shartsiz `paymentStatus: "pending"` qilardi va
   * tasdiq jimgina yo'qolardi. Endi tranzaksiyada qayta o'qiladi.
   */
  // Parallel yuklashlar oldingi tekshiruvdan birga o'tib, fayllarini
  // saqlab qo'yishi mumkin; tranzaksiya ortiqchasini rad etadi — shunda
  // uning fayli ham o'chiriladi (chegaradan tashqari yetim fayl qolmasin).
  const updated = await getAdminDb().runTransaction(async (tx) => {
    const fresh = await tx.get(ref);
    if (!fresh.exists) throw new ReceiptError("Buyurtma topilmadi.", 404);
    const current = { id: fresh.id, ...fresh.data() } as Order;
    assertUploadable(current);
    const receiptCount = (current.receiptCount ?? 0) + 1;
    // Admin avval "pul tushmadi" degan bo'lsa - yangi chek bilan qayta tekshiruvga.
    tx.update(ref, { receipt, receiptCount, paymentStatus: "pending", updatedAt: uploadedAt });
    return { ...current, receipt, receiptCount, paymentStatus: "pending", updatedAt: uploadedAt } as Order;
  }).catch(async (error: unknown) => {
    await deletePrivateFile(path).catch(() => {});
    throw error;
  });

  await refreshOrderTelegramMessage(updated);
  await sendReceiptToGroup(updated, bytes, type);
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

  await refreshOrderTelegramMessage(updated);
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
