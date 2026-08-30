import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * TELEGRAM MAXFIY KALITLARI.
 *
 * Kalitlar server env'ida turadi, lekin ularni almashtirish uchun har
 * safar deploy qilib o'tirmaslik kerak: admin (loyiha egasi) panel
 * orqali yangi qiymat yozsa, u Firestore'ning `secrets/telegram`
 * hujjatiga tushadi va env'dan ustun turadi.
 *
 * Bu hujjat clientga hech qachon ochilmaydi (firestore.rules da
 * `secrets/**` uchun read/write yopiq) - faqat Admin SDK o'qiydi.
 *
 * Har bir Telegram chaqiruvida Firestore'ga borib kelmaslik uchun
 * qiymatlar lambda ichida qisqa muddat keshlanadi.
 */

const DOC_PATH = "secrets/telegram";
const CACHE_TTL_MS = 60 * 1000;

export interface TelegramSecrets {
  botToken: string;
  /** Xodimlar guruhi chat ID si. */
  chatId: string;
  /** Webhook so'rovlarini tasdiqlovchi maxfiy so'z. */
  webhookSecret: string;
  /**
   * Bot useri (`@` siz). Maxfiy emas, lekin shu yerda turadi: bot
   * almashtirilganda `t.me/<bot>?start=login_...` havolasi ham
   * o'zgarishi kerak, aks holda "Telegram orqali kirish" ESKI botga
   * olib boradi. Panelda o'zgartiriladi - deploy kutilmaydi.
   */
  botUsername: string;
}

/** `@bot`, `https://t.me/bot` kabi ko'rinishlardan sof userni ajratadi. */
export function normalizeBotUsername(value: string): string {
  const clean = value
    .trim()
    .replace(/^https?:\/\/(?:t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "");
  return clean.split(/[/?\s]/)[0] ?? "";
}

let cache: { value: TelegramSecrets; at: number } | null = null;

function fromEnv(): TelegramSecrets {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
    botUsername: normalizeBotUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""),
  };
}

export async function getTelegramSecrets(): Promise<TelegramSecrets> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const env = fromEnv();
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const data = (snap.data() ?? {}) as Partial<TelegramSecrets>;
    const value: TelegramSecrets = {
      botToken: data.botToken?.trim() || env.botToken,
      chatId: data.chatId?.trim() || env.chatId,
      webhookSecret: data.webhookSecret?.trim() || env.webhookSecret,
      botUsername: normalizeBotUsername(data.botUsername ?? "") || env.botUsername,
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    // Firestore o'qilmasa - env bilan ishlashda davom etamiz.
    cache = { value: env, at: Date.now() };
    return env;
  }
}

/** Yangi qiymat yozilgach keshni bo'shatadi (darhol kuchga kirsin). */
export function clearTelegramSecretsCache(): void {
  cache = null;
}

/** Panelda ko'rsatish uchun niqoblangan ko'rinish: `1234…​WXYZ`. */
export function maskSecret(value: string): string {
  const clean = value.trim();
  if (!clean) return "";
  if (clean.length <= 8) return "••••";
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

/** Qiymat qayerdan kelayotgani - panelda ko'rsatiladi. */
export async function describeTelegramSecrets(): Promise<
  Record<keyof TelegramSecrets, { masked: string; source: "panel" | "env" | "none" }>
> {
  const env = fromEnv();
  let stored: Partial<TelegramSecrets> = {};
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    stored = (snap.data() ?? {}) as Partial<TelegramSecrets>;
  } catch {
    stored = {};
  }

  // Bot useri maxfiy emas - u to'liq ko'rsatiladi, qolgani niqoblanadi.
  const describe = (key: keyof TelegramSecrets, secret = true) => {
    const show = (value: string) => (secret ? maskSecret(value) : value);
    const panelValue = stored[key]?.trim();
    if (panelValue) return { masked: show(panelValue), source: "panel" as const };
    if (env[key]) return { masked: show(env[key]), source: "env" as const };
    return { masked: "", source: "none" as const };
  };

  return {
    botToken: describe("botToken"),
    chatId: describe("chatId"),
    webhookSecret: describe("webhookSecret"),
    botUsername: describe("botUsername", false),
  };
}
