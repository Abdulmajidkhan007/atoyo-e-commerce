import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * AI RASM HISOBLAGICHI VA OYLIK CHEGARA.
 *
 * Rasm generatsiyasi PULLIK (Google hisobidan yechiladi, bitta rasm
 * ~0.04 $). Xodim tugmani ketma-ket bosaversa balans sezilmay tugab
 * qoladi va o'shanda hech kim sababini bilmaydi. Shuning uchun:
 *
 *   • har chizilgan rasm sanaladi (`aiUsage/<YYYY-MM>` hujjati);
 *   • oylik chegara bor (`settings/ai.monthlyImageLimit`, standart 200);
 *   • chegara to'lganda generatsiya TO'XTAYDI va sababi o'zbekcha
 *     aytiladi - "kalit ishlamadi" degan chalg'ituvchi xato emas.
 *
 * Chegara 0 bo'lsa - cheksiz (o'z javobgarligingizga).
 */

export const DEFAULT_MONTHLY_IMAGE_LIMIT = 200;

/**
 * MATN/VISION TOKENLARI (Anthropic).
 *
 * Anthropic "qolgan balans" ni API orqali bermaydi — Usage & Cost
 * Admin API faqat SARFNI qaytaradi va u tashkilot (organization)
 * hisobini talab qiladi. Shuning uchun sarfni O'ZIMIZ sanaymiz:
 * har javobning `usage` maydoni shu yerda jamlanadi va narxnoma
 * bo'yicha taxminiy summa chiqariladi. Aniq raqam — Console → Cost.
 *
 * Narxlar: 1 000 000 token uchun dollarda (2026-06 holatiga).
 */
const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-fable-5-1": { input: 10, output: 50 },
};

/** Narxnomada yo'q model uchun - eng qimmatini olamiz (kam ko'rsatgandan yaxshi). */
const FALLBACK_PRICE = { input: 10, output: 50 };

export interface TokenCounts {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface AiTokenUsage {
  month: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Bitta javobning taxminiy narxi (dollarda).
 * Keshdan o'qilgan token ~0.1x, keshga yozilgani ~1.25x kirim narxida.
 */
export function estimateCostUsd(model: string, usage: TokenCounts): number {
  const price = MODEL_PRICES[model] ?? FALLBACK_PRICE;
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const dollars =
    (input * price.input +
      cacheRead * price.input * 0.1 +
      cacheWrite * price.input * 1.25 +
      output * price.output) /
    1_000_000;
  return Math.max(0, dollars);
}

export interface AiUsage {
  /** "2026-08" - hisob shu oy uchun. */
  month: string;
  /** Shu oyda chizilgan rasmlar soni. */
  used: number;
  /** Oylik chegara (0 - cheksiz). */
  limit: number;
}

/** Chegara qaysi oyga tegishli ekani - server vaqti bo'yicha. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function readLimit(): Promise<number> {
  try {
    const snap = await getAdminDb().doc("settings/ai").get();
    const value = snap.data()?.monthlyImageLimit;
    return typeof value === "number" && value >= 0 ? value : DEFAULT_MONTHLY_IMAGE_LIMIT;
  } catch {
    return DEFAULT_MONTHLY_IMAGE_LIMIT;
  }
}

/** Joriy oydagi holat (admin panelda ko'rsatiladi). */
export async function getImageUsage(): Promise<AiUsage> {
  const month = currentMonthKey();
  const [limit, snap] = await Promise.all([
    readLimit(),
    getAdminDb().doc(`aiUsage/${month}`).get().catch(() => null),
  ]);
  const used = snap?.data()?.images;
  return { month, used: typeof used === "number" ? used : 0, limit };
}

/** Oylik chegarani o'zgartirish (0 - cheksiz). */
export async function setImageLimit(limit: number): Promise<void> {
  await getAdminDb()
    .doc("settings/ai")
    .set({ monthlyImageLimit: Math.max(0, Math.round(limit)), updatedAt: Date.now() }, { merge: true });
}

/**
 * Chegara to'lganmi? To'lgan bo'lsa XATO tashlaydi - chaqiruvchi uni
 * o'zbekcha xabar sifatida foydalanuvchiga ko'rsatadi.
 *
 * Hisob o'qib bo'lmasa generatsiya TO'XTATILMAYDI: hisoblagich
 * yordamchi vosita, u tufayli ish to'xtab qolmasligi kerak.
 */
export async function assertImageQuota(): Promise<void> {
  try {
    const { used, limit } = await getImageUsage();
    if (limit > 0 && used >= limit) {
      throw new QuotaError(
        `Bu oyda AI rasm chegarasi to'ldi (${used}/${limit} ta). ` +
          "Sozlamalar → «AI rasm sarfi» bo'limidan chegarani oshiring."
      );
    }
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    // Hisoblagichni o'qib bo'lmadi - ishga xalaqit bermaymiz.
  }
}

/** Chegara to'lganda tashlanadigan xato (boshqa xatolardan ajratish uchun). */
export class QuotaError extends Error {}

/** Joriy oydagi token sarfi (admin panelda ko'rsatiladi). */
export async function getTokenUsage(): Promise<AiTokenUsage> {
  const month = currentMonthKey();
  const snap = await getAdminDb().doc(`aiUsage/${month}`).get().catch(() => null);
  const data = snap?.data() ?? {};
  const num = (value: unknown) => (typeof value === "number" && value > 0 ? value : 0);
  return {
    month,
    requests: num(data.requests),
    inputTokens: num(data.inputTokens),
    outputTokens: num(data.outputTokens),
    costUsd: num(data.costUsd),
  };
}

/**
 * Anthropic javobidan keyin chaqiriladi. Hisob yozilmasa ish
 * TO'XTAMAYDI - bu yordamchi o'lchov, asosiy oqim emas.
 */
export async function recordTokenUse(model: string, usage: TokenCounts | null): Promise<void> {
  if (!usage) return;
  try {
    await getAdminDb()
      .doc(`aiUsage/${currentMonthKey()}`)
      .set(
        {
          requests: FieldValue.increment(1),
          inputTokens: FieldValue.increment(
            (usage.input_tokens ?? 0) +
              (usage.cache_read_input_tokens ?? 0) +
              (usage.cache_creation_input_tokens ?? 0)
          ),
          outputTokens: FieldValue.increment(usage.output_tokens ?? 0),
          costUsd: FieldValue.increment(estimateCostUsd(model, usage)),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
  } catch {
    // Jimgina o'tamiz - javob allaqachon berilgan.
  }
}

/** Rasm muvaffaqiyatli chizilgach chaqiriladi. */
export async function recordImageUse(count = 1): Promise<void> {
  if (count <= 0) return;
  try {
    await getAdminDb()
      .doc(`aiUsage/${currentMonthKey()}`)
      .set({ images: FieldValue.increment(count), updatedAt: Date.now() }, { merge: true });
  } catch {
    // Hisob yozilmasa ham rasm chizilgan - jimgina o'tamiz.
  }
}
