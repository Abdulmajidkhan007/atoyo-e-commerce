import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { answerCallbackQuery, editTopicMessageText } from "@/lib/telegram/bot";
import { decodeOrderStatusCallback, buildOrderActionKeyboard } from "@/lib/telegram/keyboard";
import { formatOrderMessage } from "@/lib/telegram/templates";
import type { Order } from "@/types/order";

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number };
}

interface TelegramUpdate {
  callback_query?: TelegramCallbackQuery;
}

export async function POST(request: Request) {
  // Telegram webhook so'rovlari `secret_token` headeri bilan tasdiqlanadi
  // (setWebhook chaqirilganda o'rnatiladi). Bu header bo'lmasa yoki mos
  // kelmasa, so'rov soxta deb hisoblanadi va rad etiladi - shu bilan
  // /api/telegram-webhook manzilini bilgan har qanday tashqi tomon
  // buyurtma statusini o'zboshimchalik bilan o'zgartira olmaydi.
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const callbackQuery = update?.callback_query;

  if (!callbackQuery?.data || !callbackQuery.message) {
    return NextResponse.json({ ok: true });
  }

  const callback = decodeOrderStatusCallback(callbackQuery.data);
  if (!callback) {
    await answerCallbackQuery(callbackQuery.id, "Noma'lum amal.");
    return NextResponse.json({ ok: true });
  }

  const orderRef = getAdminDb().collection("orders").doc(callback.orderId);
  const orderSnapshot = await orderRef.get();

  if (!orderSnapshot.exists) {
    await answerCallbackQuery(callbackQuery.id, "Buyurtma topilmadi.");
    return NextResponse.json({ ok: true });
  }

  const updatedOrder: Order = {
    ...(orderSnapshot.data() as Order),
    status: callback.status,
    updatedAt: Date.now(),
  };

  await orderRef.update({ status: updatedOrder.status, updatedAt: updatedOrder.updatedAt });

  // Buyurtma "Yakunlandi" holatiga o'tganda tugmalar olib tashlanadi,
  // aks holda admin keyingi bosqichga o'tishi uchun tugmalar qoladi.
  await editTopicMessageText(
    callbackQuery.message.message_id,
    formatOrderMessage(updatedOrder),
    updatedOrder.status === "completed" ? undefined : buildOrderActionKeyboard(updatedOrder.id)
  );

  await answerCallbackQuery(callbackQuery.id, "Status yangilandi ✅");

  return NextResponse.json({ ok: true });
}
