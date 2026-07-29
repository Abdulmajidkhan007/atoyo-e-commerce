import { NextResponse } from "next/server";
import { answerCallbackQuery } from "@/lib/telegram/bot";
import { decodeOrderStatusCallback } from "@/lib/telegram/keyboard";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";
import { handleAdminCommand } from "@/lib/telegram/admin-commands";
import { handleAdminSessionMessage, handleAdminSessionCallback } from "@/lib/telegram/admin-session";
import { handleCustomerMessage, handleCustomerCallback } from "@/lib/telegram/customer-bot";
import { handleIntakeMessage } from "@/lib/telegram/product-intake";
import { resolveTopicConfig } from "@/lib/telegram/topics";
import { getTelegramSecrets } from "@/lib/telegram/secrets";

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
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  text?: string;
  contact?: TelegramContact;
  location?: { latitude: number; longitude: number };
  /** Rasm o'lchamlari ro'yxati - oxirgisi eng katta. */
  photo?: { file_id: string }[];
  /** Video (kirim topic'ida mahsulot videosi sifatida qabul qilinadi). */
  video?: { file_id: string };
  /** Rasm izohi (albomda faqat bitta xabarda bo'ladi). */
  caption?: string;
  /** Albom (bir nechta rasm bitta post) identifikatori. */
  media_group_id?: string;
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

function isAdminGroupChat(chat: TelegramChat | undefined, staffChatId: string): boolean {
  // Admin buyruqlari FAQAT yopiq xodimlar guruhida ishlaydi - guruh
  // a'zoligi o'zi ruxsat hisoblanadi (guruhga faqat xodimlar qo'shiladi).
  // Shaxsiy chatdagi mijozlar bu shartdan hech qachon o'ta olmaydi.
  // Guruh ID si admin panelda almashtirilishi mumkin (secrets/telegram).
  return Boolean(staffChatId) && String(chat?.id) === staffChatId;
}

export async function POST(request: Request) {
  // Telegram webhook so'rovlari `secret_token` headeri bilan tasdiqlanadi
  // (setWebhook chaqirilganda o'rnatiladi) - manzilni bilgan tashqi tomon
  // soxta so'rov yubora olmaydi.
  // Maxfiy so'z va xodimlar guruhi ID si admin panelda almashtirilgan
  // bo'lsa - o'sha qiymatlar, aks holda env.
  const { webhookSecret, chatId: staffChatId } = await getTelegramSecrets();
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  if (!webhookSecret || secretHeader !== webhookSecret) {
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
        if (!isAdminGroupChat(chat, staffChatId)) {
          await answerCallbackQuery(callbackQuery.id, "Ruxsat yo'q.");
          return NextResponse.json({ ok: true });
        }
        const updatedOrder = await applyOrderStatusUpdate(statusCallback.orderId, statusCallback.status);
        await answerCallbackQuery(callbackQuery.id, updatedOrder ? "Status yangilandi ✅" : "Buyurtma topilmadi.");
        return NextResponse.json({ ok: true });
      }

      const callbackUserId = callbackQuery.from?.id;

      // Admin guruhdagi interaktiv oqim tugmalari (ap|...) - /yangi va /tahrir
      // bosqichma-bosqich menyulari. Faqat yopiq xodimlar guruhida.
      if (isAdminGroupChat(chat, staffChatId) && callbackUserId) {
        await handleAdminSessionCallback({
          chatId: chat.id,
          userId: callbackUserId,
          threadId: callbackQuery.message.message_thread_id,
          callbackQueryId: callbackQuery.id,
          data: callbackQuery.data,
        });
        return NextResponse.json({ ok: true });
      }

      // Mijoz-do'kon tugmalari - faqat shaxsiy chatda.
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
    if (
      message &&
      (message.text || message.contact || message.location || message.photo || message.video)
    ) {
      if (isAdminGroupChat(message.chat, staffChatId)) {
        const adminUserId = message.from?.id;

        // "Kirim" topic'i: rasm + izoh = yangi mahsulot. Bu topic
        // buyruqlarga ham, interaktiv sessiyaga ham tegishli emas -
        // shuning uchun eng birinchi tekshiriladi.
        const topics = await resolveTopicConfig();
        const isIntakeTopic =
          topics.intake > 0 && message.message_thread_id === topics.intake && adminUserId;

        if (isIntakeTopic && !message.text?.trim().startsWith("/")) {
          const photoFileId = message.photo?.at(-1)?.file_id;
          const videoFileId = message.video?.file_id;
          const media = photoFileId
            ? ({ fileId: photoFileId, kind: "photo" } as const)
            : videoFileId
              ? ({ fileId: videoFileId, kind: "video" } as const)
              : undefined;
          const caption = message.caption ?? message.text;

          // Yangi kirim = rasm + izoh. Albom rasmlari (media_group_id)
          // ham doim kirim oqimiga ketadi - ular yaratilgan mahsulotga
          // qo'shiladi. Qolgan hollarda (izohsiz yolg'iz rasm, oddiy
          // matn) avval faol tahrir sessiyasiga imkon beramiz: mahsulot
          // yaratilgandan keyingi "qolgan ma'lumotlar" tugmalari shu
          // topic'da javob kutadi.
          const isNewIntake = Boolean(media && caption?.trim());
          const belongsToAlbum = Boolean(media && message.media_group_id);

          if (!isNewIntake && !belongsToAlbum) {
            const handledBySession = await handleAdminSessionMessage({
              chatId: message.chat.id,
              userId: adminUserId,
              threadId: message.message_thread_id,
              text: message.text ?? "",
              photoFileId,
            });
            if (handledBySession) return NextResponse.json({ ok: true });
          }

          await handleIntakeMessage({
            chatId: message.chat.id,
            threadId: message.message_thread_id,
            userId: adminUserId,
            authorName: [message.from?.first_name, message.from?.last_name]
              .filter(Boolean)
              .join(" "),
            caption,
            media,
            mediaGroupId: message.media_group_id,
          });
          return NextResponse.json({ ok: true });
        }

        if (message.text?.trim().startsWith("/")) {
          // "/" buyruqlar (jumladan interaktiv oqimni boshlovchi /yangi, /tahrir).
          await handleAdminCommand({
            chatId: message.chat.id,
            threadId: message.message_thread_id,
            text: message.text,
            userId: adminUserId,
          });
        } else if (adminUserId && (message.text || message.photo)) {
          // Buyruq bo'lmagan matn/rasm - faol interaktiv sessiya bosqichi
          // bo'lishi mumkin (nom/narx kiritish yoki mahsulot rasmi).
          // Sessiya bo'lmasa e'tiborsiz.
          await handleAdminSessionMessage({
            chatId: message.chat.id,
            userId: adminUserId,
            threadId: message.message_thread_id,
            text: message.text ?? "",
            photoFileId: message.photo?.at(-1)?.file_id,
          });
        }
      } else if (message.chat.type === "private" && message.from?.id) {
        await handleCustomerMessage({
          chatId: message.chat.id,
          userId: message.from.id,
          text: message.text,
          firstName: message.from.first_name,
          lastName: message.from.last_name,
          username: message.from.username,
          contact: message.contact,
          location: message.location,
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
