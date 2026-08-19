import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * KANAL POSTLARI TEZLIGI VA NAVBATI.
 *
 * MUAMMO: bir vaqtning o'zida ko'p mahsulot kirim qilinsa (xodim
 * guruhdan ketma-ket yuboradi yoki saytdan bir necha mahsulot
 * qo'shiladi) kanal bir necha daqiqada o'nlab post bilan to'lib
 * ketadi. Obunachi uchun bu spam, Telegram uchun esa chegaradan
 * oshish (`429 retry_after`).
 *
 * YECHIM: OYNA (window) bo'yicha chegara — masalan **10 daqiqada
 * 5 ta post**. Chegaradan oshgani darhol yuborilmaydi, NAVBATGA
 * tushadi va oyna bo'shashi bilan avtomatik chiqadi.
 *
 * Hisob KUNDALIK EMAS, "surilib boruvchi oyna": oxirgi N daqiqada
 * nechta post ketgani sanaladi. Vaqt belgilari `settings/telegram`
 * hujjatidagi kichik massivda (`channelRecent`) saqlanadi — alohida
 * kolleksiya ham, indeks ham kerak emas.
 *
 * Navbat esa `channelQueue` kolleksiyasida: har yozuv bitta
 * mahsulot va uning "qachondan keyin" chiqishi.
 */

const SETTINGS_DOC = "settings/telegram";
const QUEUE = "channelQueue";

/** Standart tezlik: 10 daqiqada 5 ta post. */
export const DEFAULT_CHANNEL_PACE = { maxPerWindow: 5, windowMinutes: 10 };

export interface ChannelPace {
  /** Bitta oynada ko'pi bilan shuncha YANGI post. 0 - chegarasiz. */
  maxPerWindow: number;
  /** Oyna uzunligi (daqiqa). */
  windowMinutes: number;
}

export interface QueuedPost {
  id: string;
  productId: string;
  productName: string;
  /** Shu vaqtdan keyin chiqariladi (epoch millis). */
  dueAt: number;
  createdAt: number;
  /** Nechta marta urinilgani (3 tadan keyin tashlab yuboriladi). */
  attempts?: number;
}

const MAX_ATTEMPTS = 3;

/** Sozlamadagi tezlik (o'qib bo'lmasa - standart). */
export async function getChannelPace(): Promise<ChannelPace> {
  try {
    const snapshot = await getAdminDb().doc(SETTINGS_DOC).get();
    const data = snapshot.data() as Partial<{
      channelMaxPerWindow: number;
      channelWindowMinutes: number;
    }> | undefined;

    const maxPerWindow = Number(data?.channelMaxPerWindow);
    const windowMinutes = Number(data?.channelWindowMinutes);

    return {
      maxPerWindow: Number.isFinite(maxPerWindow) && maxPerWindow >= 0
        ? maxPerWindow
        : DEFAULT_CHANNEL_PACE.maxPerWindow,
      windowMinutes: Number.isFinite(windowMinutes) && windowMinutes > 0
        ? windowMinutes
        : DEFAULT_CHANNEL_PACE.windowMinutes,
    };
  } catch {
    return DEFAULT_CHANNEL_PACE;
  }
}

/** Oxirgi oynadagi post vaqtlari (eskilari tozalangan). */
async function recentPosts(windowMs: number): Promise<number[]> {
  const snapshot = await getAdminDb().doc(SETTINGS_DOC).get();
  const raw = (snapshot.data()?.channelRecent ?? []) as unknown[];
  const now = Date.now();
  return raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && now - value < windowMs)
    .sort((a, b) => a - b);
}

/**
 * QARORNING SOF (pure) QISMI — bazasiz, shuning uchun test bilan
 * qoplangan (`channel-queue.test.ts`). Bu yerda hech qanday
 * yon ta'sir yo'q: kirish - oxirgi post vaqtlari, chiqish - qaror.
 */
export function decideSlot(recent: number[], pace: ChannelPace, now: number): SlotDecision {
  if (pace.maxPerWindow <= 0) {
    return { allowed: true, nextAt: now, remaining: Number.POSITIVE_INFINITY };
  }

  const windowMs = pace.windowMinutes * 60_000;
  const inWindow = recent.filter((at) => now - at < windowMs).sort((a, b) => a - b);

  if (inWindow.length < pace.maxPerWindow) {
    return { allowed: true, nextAt: now, remaining: pace.maxPerWindow - inWindow.length - 1 };
  }

  // Oynadagi ENG ESKI post o'chishi bilan joy bo'shaydi.
  const oldest = inWindow[0] ?? now;
  return { allowed: false, nextAt: oldest + windowMs, remaining: 0 };
}

export interface SlotDecision {
  /** Hozir yuborsa bo'ladimi. */
  allowed: boolean;
  /** Ruxsat yo'q bo'lsa - qachondan keyin bo'shaydi (epoch millis). */
  nextAt: number;
  /** Oynada nechta joy qolgani (ma'lumot uchun). */
  remaining: number;
}

/**
 * BITTA JOY BAND QILISH.
 *
 * Ruxsat berilsa vaqt belgisi darhol yoziladi (ya'ni joy egallanadi),
 * shuning uchun ketma-ket chaqiruvlar bir joyni ikki marta olmaydi.
 * Chegara 0 bo'lsa har doim ruxsat.
 */
export async function reserveChannelSlot(): Promise<SlotDecision> {
  const pace = await getChannelPace();
  if (pace.maxPerWindow <= 0) {
    return { allowed: true, nextAt: Date.now(), remaining: Number.POSITIVE_INFINITY };
  }

  const windowMs = pace.windowMinutes * 60_000;
  const now = Date.now();

  try {
    const recent = await recentPosts(windowMs);
    const decision = decideSlot(recent, pace, now);

    // Ruxsat berilsa joy DARHOL egallanadi - ketma-ket chaqiruvlar
    // bitta joyni ikki marta olmasin.
    if (decision.allowed) {
      await getAdminDb()
        .doc(SETTINGS_DOC)
        .set({ channelRecent: [...recent, now] }, { merge: true });
    }
    return decision;
  } catch (error) {
    // Hisobni o'qib bo'lmasa e'lon TO'XTAMAYDI - chegara yordamchi
    // vosita, asosiy ish emas.
    console.error("Kanal tezligini hisoblashda xato:", error);
    return { allowed: true, nextAt: now, remaining: 0 };
  }
}

/** Navbatga qo'shish (mahsulot allaqachon navbatda bo'lsa - qayta emas). */
export async function enqueueChannelPost(
  productId: string,
  productName: string,
  dueAt: number
): Promise<void> {
  const db = getAdminDb();
  const existing = await db.collection(QUEUE).where("productId", "==", productId).limit(1).get();
  if (!existing.empty) return;

  const ref = db.collection(QUEUE).doc();
  const job: QueuedPost = {
    id: ref.id,
    productId,
    productName,
    dueAt,
    createdAt: Date.now(),
    attempts: 0,
  };
  await ref.set(job);
}

/** Vaqti kelgan navbat yozuvlari (eng eskisidan). */
export async function dueChannelPosts(limit = 5): Promise<QueuedPost[]> {
  const snapshot = await getAdminDb()
    .collection(QUEUE)
    .where("dueAt", "<=", Date.now())
    .orderBy("dueAt")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => doc.data() as QueuedPost);
}

/** Navbat holati (admin panel uchun). */
export async function channelQueueSummary(): Promise<{ pending: number; next: QueuedPost | null }> {
  const snapshot = await getAdminDb().collection(QUEUE).orderBy("dueAt").limit(50).get();
  const items = snapshot.docs.map((doc) => doc.data() as QueuedPost);
  return { pending: items.length, next: items[0] ?? null };
}

export async function removeFromQueue(id: string): Promise<void> {
  await getAdminDb().collection(QUEUE).doc(id).delete().catch(() => {});
}

/** Urinish sanog'ini oshiradi; chegaradan oshsa yozuvni o'chiradi. */
export async function markQueueAttempt(job: QueuedPost, nextAt: number): Promise<void> {
  const attempts = (job.attempts ?? 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await removeFromQueue(job.id);
    return;
  }
  await getAdminDb()
    .collection(QUEUE)
    .doc(job.id)
    .update({ attempts: FieldValue.increment(1), dueAt: nextAt })
    .catch(() => {});
}
