import { NextResponse } from "next/server";
import { answerCallbackQuery } from "@/lib/telegram/bot";
import { decodeOrderStatusCallback } from "@/lib/telegram/keyboard";
import { applyOrderStatusUpdate } from "@/lib/orders/update-status";
import { handleAdminCommand } from "@/lib/telegram/admin-commands";
import { handleAdminSessionMessage, handleAdminSessionCallback } from "@/lib/telegram/admin-session";
import { handleCustomerMessage, handleCustomerCallback } from "@/lib/telegram/customer-bot";
import { handleIntakeMessage } from "@/lib/telegram/product-intake";
import { handleStickerCommand, handleStickerMessage } from "@/lib/telegram/sticker-commands";
import { handleForwardedChannelPost, type ForwardedPost } from "@/lib/telegram/channel-report";
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
  /** Stiker (xodimlar guruhida bot javob stikerlarini sozlash uchun). */
  sticker?: {
    file_id: string;
    set_name?: string;
    emoji?: string;
    is_animated?: boolean;
    is_video?: boolean;
  };
  /** Reply qilingan xabar (stikerni slotga biriktirishda kerak). */
  reply_to_message?: TelegramMessage;
  /**
   * Forward qilingan xabar manbasi. Bot API 7.0 dan `forward_origin`,
   * undan oldin `forward_from_chat` + `forward_from_message_id` edi -
   * eski mijozlar hali ham eski shaklni yuborishi mumkin, shuning
   * uchun IKKALASI ham o'qiladi.
   */
  forward_origin?: {
    type: string;
    chat?: { id: number; title?: string };
    message_id?: number;
  };
  forward_from_chat?: { id: number; title?: string };
  forward_from_message_id?: number;
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

/**
 * Xabar KANALDAN forward qilinganmi. Shunday bo'lsa xodim postning
 * hisobotini so'ragan bo'ladi (`channel-report.ts`).
 */
function forwardedChannelPost(message: TelegramMessage): ForwardedPost | null {
  const origin = message.forward_origin;
  if (origin?.type === "channel" && origin.chat && origin.message_id) {
    return { chatId: origin.chat.id, messageId: origin.message_id, chatTitle: origin.chat.title };
  }
  if (message.forward_from_chat && message.forward_from_message_id) {
    return {
      chatId: message.forward_from_chat.id,
      messageId: message.forward_from_message_id,
      chatTitle: message.forward_from_chat.title,
    };
  }
  return null;
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
      (message.text ||
        message.contact ||
        message.location ||
        message.photo ||
        message.video ||
        message.sticker ||
        // Forward qilingan post rasmsiz/matnsiz ham bo'lishi mumkin
        // (masalan albom) - u ham qabul qilinadi.
        message.forward_origin ||
        message.forward_from_chat)
    ) {
      if (isAdminGroupChat(message.chat, staffChatId)) {
        const adminUserId = message.from?.id;

        // KANALDAN FORWARD qilingan post = "shu postning hisobini
        // ko'rsat" degani. Eng birinchi tekshiriladi: forward hech
        // qachon kirim ham, sessiya javobi ham emas.
        const forwarded = forwardedChannelPost(message);
        if (forwarded) {
          await handleForwardedChannelPost({
            chatId: message.chat.id,
            threadId: message.message_thread_id,
            post: forwarded,
          });
          return NextResponse.json({ ok: true });
        }

        // Xodimlar guruhiga tashlangan stiker: bot uning kodini aytadi
        // va to'plamni eslab qoladi (kirim topic'ida bundan mustasno -
        // u yerda stiker mahsulotga aloqador emas).
        if (message.sticker && !message.text) {
          await handleStickerMessage({
            chatId: message.chat.id,
            threadId: message.message_thread_id,
            sticker: message.sticker,
          });
          return NextResponse.json({ ok: true });
        }

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

        // Stiker buyruqlari alohida - ular reply qilingan stikerni
        // ham ko'rishi kerak.
        const stickerCommand = message.text?.trim().match(/^\/stiker(?:lar)?(?:@\S+)?\b/i);
        if (stickerCommand) {
          await handleStickerCommand({
            chatId: message.chat.id,
            threadId: message.message_thread_id,
            userId: adminUserId,
            argsText: message.text!.trim().slice(stickerCommand[0].length).trim(),
            replySticker: message.reply_to_message?.sticker,
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
          // Mijoz surat yuborsa - katalogdan o'xshashini qidiramiz.
          photoFileId: message.photo?.at(-1)?.file_id,
          caption: message.caption,
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
