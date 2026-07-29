import "server-only";
import { resolveTopicConfig, resolveThreadId } from "./topics";
import { getTelegramSecrets } from "./secrets";
import type { TelegramTopicKey } from "@/types/telegram";

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Token va guruh ID si avval admin panelda saqlangan qiymatdan
 * (server-only `secrets/telegram`), u bo'lmasa env'dan olinadi -
 * shuning uchun ikkalasi ham async.
 */
async function getBotToken(): Promise<string> {
  const { botToken } = await getTelegramSecrets();
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN aniqlanmagan.");
  return botToken;
}

async function getChatId(): Promise<string> {
  const { chatId } = await getTelegramSecrets();
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID aniqlanmagan.");
  return chatId;
}

async function callTelegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${await getBotToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // Bot API'ga navigatsiya - keshlanmasin.
    cache: "no-store",
  });

  // Telegram har doim JSON qaytaradi, lekin oradagi proksi/firewall
  // xato holatida oddiy matn qaytarishi mumkin - JSON.parse yiqilib,
  // asl sababni yashirib qo'ymasligi uchun avval matn sifatida o'qiymiz.
  const rawBody = await response.text();
  let data: { ok: boolean; description?: string; result?: T };
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Telegram API'dan kutilmagan javob (${method}, HTTP ${response.status}): ${rawBody.slice(0, 120)}`);
  }

  if (!data.ok) {
    throw new Error(`Telegram API xatosi (${method}): ${data.description ?? "noma'lum xato"}`);
  }

  return data.result as T;
}

interface SentMessage {
  message_id: number;
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Istalgan chatga (shaxsiy chat yoki guruh thread'i) xabar yuboradi.
 * Mijoz-bot oqimi va admin buyruqlariga javoblar uchun ishlatiladi.
 */
export async function sendChatMessage(
  chatId: number | string,
  text: string,
  options?: { replyMarkup?: InlineKeyboardMarkup; threadId?: number; photoUrl?: string }
): Promise<SentMessage> {
  if (options?.photoUrl) {
    return callTelegramApi<SentMessage>("sendPhoto", {
      chat_id: chatId,
      message_thread_id: options?.threadId,
      photo: options.photoUrl,
      caption: text,
      parse_mode: "HTML",
      reply_markup: options?.replyMarkup,
    });
  }

  return callTelegramApi<SentMessage>("sendMessage", {
    chat_id: chatId,
    message_thread_id: options?.threadId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: options?.replyMarkup,
  });
}

/**
 * Bir nechta rasmni bitta "albom" (media group) qilib yuboradi.
 * Telegram cheklovlari: 2-10 ta element, faqat birinchisida caption
 * bo'lishi mumkin va albomga inline tugma biriktirib bo'lmaydi -
 * shuning uchun havola caption ichida HTML <a> sifatida beriladi.
 *
 * Bitta rasm qolsa albom yuborilmaydi (Telegram xato beradi) - chaqiruvchi
 * tomonda oddiy sendPhoto ishlatiladi.
 */
export async function sendMediaGroup(
  chatId: number | string,
  photoUrls: string[],
  options?: { caption?: string; threadId?: number }
): Promise<SentMessage[]> {
  const photos = photoUrls.filter(Boolean).slice(0, 10);
  if (photos.length < 2) return [];

  return callTelegramApi<SentMessage[]>("sendMediaGroup", {
    chat_id: chatId,
    message_thread_id: options?.threadId,
    media: photos.map((url, index) => ({
      type: "photo",
      media: url,
      ...(index === 0 && options?.caption
        ? { caption: options.caption, parse_mode: "HTML" }
        : {}),
    })),
  });
}

/** Berilgan forum-topic (thread) ga xabar yuboradi. */
export async function sendTopicMessage(
  topicKey: TelegramTopicKey,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<SentMessage> {
  const threadId = resolveThreadId(await resolveTopicConfig(), topicKey);

  return callTelegramApi<SentMessage>("sendMessage", {
    chat_id: await getChatId(),
    message_thread_id: threadId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: replyMarkup,
  });
}

/**
 * Yuborilgan xabar matnini/izohini yangilaydi. Kanaldagi e'lon
 * o'zgarganda yangi post tashlamaslik uchun ishlatiladi (albomda
 * birinchi - izohli - xabar tahrirlanadi).
 */
export async function editMessageCaptionOrText(params: {
  chatId: number | string;
  messageId: number;
  text: string;
  /** Xabar rasm bilan yuborilganmi (unda caption tahrirlanadi). */
  hasPhoto: boolean;
  replyMarkup?: InlineKeyboardMarkup;
}): Promise<void> {
  await callTelegramApi(params.hasPhoto ? "editMessageCaption" : "editMessageText", {
    chat_id: params.chatId,
    message_id: params.messageId,
    ...(params.hasPhoto ? { caption: params.text } : { text: params.text }),
    parse_mode: "HTML",
    reply_markup: params.replyMarkup,
  });
}

/** Xabarni o'chiradi (bot o'zi yuborgan xabarni 48 soat ichida o'chira oladi). */
export async function deleteMessage(chatId: number | string, messageId: number): Promise<void> {
  await callTelegramApi("deleteMessage", { chat_id: chatId, message_id: messageId });
}

export async function editTopicMessageText(
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<void> {
  await callTelegramApi("editMessageText", {
    chat_id: await getChatId(),
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

/**
 * ReplyKeyboard bilan xabar yuboradi (masalan "📞 Telefon raqamni yuborish"
 * request_contact tugmasi). InlineKeyboard'dan farqli - bu foydalanuvchi
 * klaviaturasi ustida chiqadi.
 */
export async function sendChatMessageWithReplyKeyboard(
  chatId: number | string,
  text: string,
  keyboard: { text: string; request_contact?: boolean; request_location?: boolean }[][]
): Promise<SentMessage> {
  return callTelegramApi<SentMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { keyboard, resize_keyboard: true, one_time_keyboard: true },
  });
}

/** ReplyKeyboard'ni olib tashlaydi (checkout tugagach). */
export async function removeReplyKeyboard(chatId: number | string, text: string): Promise<SentMessage> {
  return callTelegramApi<SentMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: { remove_keyboard: true },
  });
}

/** Foydalanuvchi biror kanal/guruh a'zosimi - tekshiradi (getChatMember). */
export async function isChatMember(channelId: string, userId: number): Promise<boolean> {
  try {
    const result = await callTelegramApi<{ status: string }>("getChatMember", {
      chat_id: channelId,
      user_id: userId,
    });
    // "left" va "kicked" = a'zo emas; qolganlari (member/administrator/creator/restricted) = a'zo.
    return !["left", "kicked"].includes(result.status);
  } catch {
    // Bot kanalda admin bo'lmasa yoki kanal noto'g'ri bo'lsa - tekshirib
    // bo'lmaydi; majburlab qolib ketmaslik uchun "a'zo" deb hisoblaymiz.
    return true;
  }
}

/**
 * Telegram'ga yuborilgan faylni (masalan, admin yuborgan mahsulot rasmini)
 * yuklab oladi - keyin Admin SDK orqali Storage'ga o'tkaziladi. Bot API
 * cheklovi: 20 MB gacha (rasm uchun bemalol yetadi).
 */
export async function downloadTelegramFile(
  fileId: string
): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
  const info = await callTelegramApi<{ file_path?: string }>("getFile", { file_id: fileId });
  const filePath = info.file_path ?? "";
  if (!filePath) throw new Error("Telegram fayl yo'li topilmadi.");

  const response = await fetch(`${TELEGRAM_API_BASE}/file/bot${await getBotToken()}/${filePath}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Telegram faylini yuklab bo'lmadi (HTTP ${response.status}).`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "jpg";
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { buffer, contentType, fileName: `telegram-${Date.now()}.${ext}` };
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}

export async function setTelegramWebhook(webhookUrl: string, secretToken: string): Promise<void> {
  await callTelegramApi("setWebhook", {
    url: webhookUrl,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}
