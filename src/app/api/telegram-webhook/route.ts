import { NextResponse } from "next/server";
import { answerCallbackQuery } from "@/lib/telegram/bot";
import { decodeOrderStatusCallback } from "@/lib/telegram/keyboard";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";
import { handleAdminCommand } from "@/lib/telegram/admin-commands";
import { handleCustomerMessage, handleCustomerCallback } from "@/lib/telegram/customer-bot";

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
}

interface TelegramContact {
  phone_number: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  message_thread_id?: number;
  chat: TelegramChat;
  from?: { id: number };
  text?: string;
  contact?: TelegramContact;
}

interface TelegramCallbackQuery {
  id: string;
  data?: string;
  from?: { id: number };
  message?: TelegramMessage;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

function isAdminGroupChat(chat: TelegramChat | undefined): boolean {
  // Admin buyruqlari FAQAT yopiq xodimlar guruhida ishlaydi - guruh
  // a'zoligi o'zi ruxsat hisoblanadi (guruhga faqat xodimlar qo'shiladi).
  // Shaxsiy chatdagi mijozlar bu shartdan hech qachon o'ta olmaydi.
  return String(chat?.id) === process.env.TELEGRAM_CHAT_ID;
}

export async function POST(request: Request) {
  // Telegram webhook so'rovlari `secret_token` headeri bilan tasdiqlanadi
  // (setWebhook chaqirilganda o'rnatiladi) - manzilni bilgan tashqi tomon
  // soxta so'rov yubora olmaydi.
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;

  try {
    // ============ 1) Inline tugma bosishlari ============
    const callbackQuery = update?.callback_query;
    if (callbackQuery?.data && callbackQuery.message) {
      const chat = callbackQuery.message.chat;

      // Buyurtma status tugmalari (os|...) - faqat admin guruhdagi
      // xabarlarda mavjud, shuning uchun faqat o'sha yerdan kela oladi.
      const statusCallback = decodeOrderStatusCallback(callbackQuery.data);
      if (statusCallback) {
        if (!isAdminGroupChat(chat)) {
          await answerCallbackQuery(callbackQuery.id, "Ruxsat yo'q.");
          return NextResponse.json({ ok: true });
        }
        const updatedOrder = await applyOrderStatusUpdate(statusCallback.orderId, statusCallback.status);
        await answerCallbackQuery(callbackQuery.id, updatedOrder ? "Status yangilandi ✅" : "Buyurtma topilmadi.");
        return NextResponse.json({ ok: true });
      }

      // Mijoz-do'kon tugmalari - faqat shaxsiy chatda.
      const callbackUserId = callbackQuery.from?.id;
      if (chat.type === "private" && callbackUserId) {
        await handleCustomerCallback({
          chatId: chat.id,
          userId: callbackUserId,
          callbackQueryId: callbackQuery.id,
          data: callbackQuery.data,
        });
        return NextResponse.json({ ok: true });
      }

      await answerCallbackQuery(callbackQuery.id);
      return NextResponse.json({ ok: true });
    }

    // ============ 2) Xabarlar (matn yoki telefon kontakti) ============
    const message = update?.message;
    if (message && (message.text || message.contact)) {
      if (isAdminGroupChat(message.chat)) {
        // Guruhda faqat "/" buyruqlarga javob beramiz - oddiy suhbatga aralashmaymiz.
        if (message.text?.trim().startsWith("/")) {
          await handleAdminCommand({
            chatId: message.chat.id,
            threadId: message.message_thread_id,
            text: message.text,
          });
        }
      } else if (message.chat.type === "private" && message.from?.id) {
        await handleCustomerMessage({
          chatId: message.chat.id,
          userId: message.from.id,
          text: message.text,
          contact: message.contact,
        });
      }
      // Boshqa guruhlar/kanallar e'tiborsiz qoldiriladi.
    }
  } catch (error) {
    // Telegram xatoga 200 kutadi - aks holda bir xil update'ni qayta-qayta
    // yuboraveradi. Sabab loglarda qoladi.
    console.error("Webhook update'ini qayta ishlashda xato:", error);
  }

  return NextResponse.json({ ok: true });
}
