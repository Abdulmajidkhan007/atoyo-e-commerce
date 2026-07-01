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

  const data = (await response.json()) as { ok: boolean; description?: string; result?: T };

  if (!data.ok) {
    throw new Error(`Telegram API xatosi (${method}): ${data.description ?? "noma'lum xato"}`);
  }

  return data.result as T;
}

interface SentMessage {
  message_id: number;
}

interface InlineKeyboardMarkup {
  inline_keyboard: { text: string; callback_data: string }[][];
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
    allowed_updates: ["callback_query"],
  });
}
