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
