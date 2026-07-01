import { NextResponse } from "next/server";
import { answerCallbackQuery } from "@/lib/telegram/bot";
import { decodeOrderStatusCallback } from "@/lib/telegram/keyboard";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";

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

  const updatedOrder = await applyOrderStatusUpdate(callback.orderId, callback.status);
  if (!updatedOrder) {
    await answerCallbackQuery(callbackQuery.id, "Buyurtma topilmadi.");
    return NextResponse.json({ ok: true });
  }

  await answerCallbackQuery(callbackQuery.id, "Status yangilandi ✅");

  return NextResponse.json({ ok: true });
}
