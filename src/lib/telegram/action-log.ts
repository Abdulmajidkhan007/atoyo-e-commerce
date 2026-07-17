import "server-only";
import { sendTopicMessage } from "./bot";

/**
 * Sayt/botdagi muhim hodisalarni guruhning "Actions" topic'iga yozadi
 * (standart thread ID 22, admin panel bot sozlamalaridan o'zgartiriladi).
 * Best-effort: Telegram ishlamasa asosiy oqim to'xtamaydi.
 */
export async function logAction(text: string): Promise<void> {
  try {
    await sendTopicMessage("actions", `⚡ ${text}`);
  } catch (error) {
    console.error("Action log yuborilmadi:", error);
  }
}
