import "server-only";
import type { TelegramTopicConfig, TelegramTopicKey } from "@/types/telegram";

/**
 * Guruhdagi forum-topic thread ID lari. Standart holatda .env dan
 * o'qiladi, lekin admin panel orqali Firestore `settings/telegram`
 * hujjatida qayta yozilishi mumkin (bot.ts ichidagi funksiyalar avval
 * Firestore'ni tekshiradi, topilmasa shu default qiymatlarga tushadi).
 */
export function getDefaultTopicConfig(): TelegramTopicConfig {
  return {
    orders: Number(process.env.TELEGRAM_TOPIC_ORDERS_ID ?? 0),
    contact: Number(process.env.TELEGRAM_TOPIC_CONTACT_ID ?? 0),
    subscribers: Number(process.env.TELEGRAM_TOPIC_SUBSCRIBERS_ID ?? 0),
  };
}

export function resolveThreadId(config: TelegramTopicConfig, key: TelegramTopicKey): number {
  return config[key];
}
