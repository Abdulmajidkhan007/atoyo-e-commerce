import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { TelegramTopicConfig, TelegramTopicKey } from "@/types/telegram";

const SETTINGS_DOC_PATH = ["settings", "telegram"] as const;

function getDefaultTopicConfig(): TelegramTopicConfig {
  return {
    orders: Number(process.env.TELEGRAM_TOPIC_ORDERS_ID ?? 0),
    contact: Number(process.env.TELEGRAM_TOPIC_CONTACT_ID ?? 0),
    subscribers: Number(process.env.TELEGRAM_TOPIC_SUBSCRIBERS_ID ?? 0),
    actions: Number(process.env.TELEGRAM_TOPIC_ACTIONS_ID ?? 22),
    intake: Number(process.env.TELEGRAM_TOPIC_INTAKE_ID ?? 151),
  };
}

/**
 * Guruhdagi forum-topic thread ID lari. Avval Firestore `settings/telegram`
 * hujjatidan o'qiladi (admin panelning Bot Sozlamalari sahifasidan
 * o'zgartirilishi mumkin) - hujjat mavjud bo'lmasa yoki bo'sh bo'lsa,
 * `.env` dagi standart qiymatlarga tushadi.
 */
export async function resolveTopicConfig(): Promise<TelegramTopicConfig> {
  const defaults = getDefaultTopicConfig();

  try {
    const snapshot = await getAdminDb().doc(SETTINGS_DOC_PATH.join("/")).get();
    const data = snapshot.data();
    if (!data) return defaults;

    return {
      orders: Number(data.orders ?? defaults.orders),
      contact: Number(data.contact ?? defaults.contact),
      subscribers: Number(data.subscribers ?? defaults.subscribers),
      actions: Number(data.actions ?? defaults.actions),
      intake: Number(data.intake ?? defaults.intake),
    };
  } catch {
    return defaults;
  }
}

export function resolveThreadId(config: TelegramTopicConfig, key: TelegramTopicKey): number {
  return config[key];
}
