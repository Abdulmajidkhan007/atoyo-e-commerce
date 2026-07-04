import "server-only";
import { resolveTopicConfig, resolveThreadId } from "./topics";
import type { TelegramTopicKey } from "@/types/telegram";

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN aniqlanmagan.");
  return token;
}

function getChatId(): string {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID aniqlanmagan.");
  return chatId;
}

async function callTelegramApi<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${getBotToken()}/${method}`, {
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

/** Berilgan forum-topic (thread) ga xabar yuboradi. */
export async function sendTopicMessage(
  topicKey: TelegramTopicKey,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<SentMessage> {
  const threadId = resolveThreadId(await resolveTopicConfig(), topicKey);

  return callTelegramApi<SentMessage>("sendMessage", {
    chat_id: getChatId(),
    message_thread_id: threadId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: replyMarkup,
  });
}

export async function editTopicMessageText(
  messageId: number,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
): Promise<void> {
  await callTelegramApi("editMessageText", {
    chat_id: getChatId(),
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
  keyboard: { text: string; request_contact?: boolean }[][]
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
