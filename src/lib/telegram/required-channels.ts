import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

export interface RequiredChannel {
  /** @username yoki -100... ID (getChatMember uchun) */
  chatId: string;
  /** Ko'rsatiladigan nom */
  title: string;
  /** Obuna bo'lish uchun havola (https://t.me/...) */
  url: string;
}

/**
 * Mijoz-bot foydalanuvchi tomonidan obuna bo'linishi SHART bo'lgan
 * kanallar. Admin panelning "Bot Sozlamalari" bo'limidan boshqariladi
 * (`settings/telegram` hujjatidagi `requiredChannels` massivi).
 * Bo'sh bo'lsa - hech qanday majburiy obuna talab qilinmaydi.
 */
export async function getRequiredChannels(): Promise<RequiredChannel[]> {
  try {
    const snapshot = await getAdminDb().doc("settings/telegram").get();
    const data = snapshot.data();
    const raw = data?.requiredChannels;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c) => c && typeof c.chatId === "string" && c.chatId.trim())
      .map((c) => ({
        chatId: String(c.chatId).trim(),
        title: String(c.title ?? c.chatId).trim(),
        url: String(c.url ?? "").trim(),
      }));
  } catch {
    return [];
  }
}
