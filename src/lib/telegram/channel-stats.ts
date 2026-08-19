import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getChatMemberCount } from "./bot";
import { resolveChannelId } from "./channel";
import { dayKey, staleDayKeys, sumRecentDays } from "./click-days";

/**
 * KANAL POSTI STATISTIKASI.
 *
 * MUHIM CHEKLOV: Telegram Bot API postni KIM ko'rganini bermaydi —
 * bunday ma'lumot umuman yo'q (post ko'rishlar soni ham faqat kanal
 * egasiga, Telegram ilovasining o'zida ko'rinadi). Shuning uchun
 * "kim ko'rdi" o'rniga BIZ O'ZIMIZ o'lchay oladigan narsa sanaladi:
 *
 *   post ostidagi "🛒 Saytda ko'rish" tugmasi NECHA MARTA bosilgan.
 *
 * Tugma endi to'g'ridan-to'g'ri mahsulot sahifasiga emas, `/k/<id>`
 * yo'liga qaraydi: u bosilishni sanab, keyin mahsulot sahifasiga
 * yo'naltiradi. Mijoz uchun farqi yo'q (bir lahza), biz uchun esa
 * qaysi post ishlayotgani ko'rinadi.
 *
 * Saqlash: `channelClicks/{productId}`
 *   { total, days: { "2026-08-19": 4, ... }, lastAt, name }
 * Alohida kolleksiya/indeks kerak emas — bitta hujjatga `increment`.
 */

/** Kunlik kalitlar shuncha kundan ko'p bo'lsa eskilari tozalanadi. */
const MAX_DAY_KEYS = 90;

export interface ClickStats {
  productId: string;
  /** Umumiy bosilishlar. */
  total: number;
  /** Oxirgi 7 kun. */
  week: number;
  /** Bugun. */
  today: number;
  /** Oxirgi bosilish vaqti (ms) yoki `null`. */
  lastAt: number | null;
  /** Mahsulot nomi (hisobotni o'qishga qulay bo'lsin uchun). */
  name?: string;
}

const EMPTY: Omit<ClickStats, "productId"> = { total: 0, week: 0, today: 0, lastAt: null };

interface ClickDoc {
  total?: number;
  days?: Record<string, number>;
  lastAt?: number;
  name?: string;
}

/**
 * Bosilishni sanaydi. XATO YUTILADI: statistika yordamchi vosita,
 * u yiqilsa ham mijoz mahsulot sahifasiga borishi kerak.
 */
export async function trackChannelClick(productId: string, name?: string): Promise<void> {
  const now = Date.now();
  try {
    await getAdminDb()
      .collection("channelClicks")
      .doc(productId)
      .set(
        {
          total: FieldValue.increment(1),
          days: { [dayKey(now)]: FieldValue.increment(1) },
          lastAt: now,
          ...(name ? { name } : {}),
        },
        { merge: true }
      );
  } catch (error) {
    console.warn("Kanal bosilishini yozib bo'lmadi:", error);
  }
}

/** Bitta mahsulotning bosilish hisobi. */
export async function clickStatsFor(productId: string): Promise<ClickStats> {
  const snap = await getAdminDb().collection("channelClicks").doc(productId).get();
  if (!snap.exists) return { productId, ...EMPTY };
  const data = (snap.data() ?? {}) as ClickDoc;
  const now = Date.now();

  // Kunlik kalitlar cheksiz o'smasin — eskilarini o'qish paytida
  // tozalab ketamiz (alohida cron kerak emas).
  const stale = staleDayKeys(data.days, MAX_DAY_KEYS);
  if (stale.length > 0) {
    const patch: Record<string, unknown> = {};
    for (const key of stale) patch[`days.${key}`] = FieldValue.delete();
    await snap.ref.update(patch).catch(() => {});
  }

  return {
    productId,
    total: data.total ?? 0,
    week: sumRecentDays(data.days, 7, now),
    today: sumRecentDays(data.days, 1, now),
    lastAt: data.lastAt ?? null,
    name: data.name,
  };
}

/** Eng ko'p bosilgan mahsulotlar (kanal postlari reytingi). */
export async function topClickedProducts(limit = 5): Promise<ClickStats[]> {
  const snap = await getAdminDb()
    .collection("channelClicks")
    .orderBy("total", "desc")
    .limit(limit)
    .get();
  const now = Date.now();
  return snap.docs.map((doc) => {
    const data = (doc.data() ?? {}) as ClickDoc;
    return {
      productId: doc.id,
      total: data.total ?? 0,
      week: sumRecentDays(data.days, 7, now),
      today: sumRecentDays(data.days, 1, now),
      lastAt: data.lastAt ?? null,
      name: data.name,
    };
  });
}

export interface AudienceStats {
  /** Kanal obunachilari (bot kanalda admin bo'lmasa - `null`). */
  subscribers: number | null;
  /** Botdan ro'yxatdan o'tgan mijozlar. */
  botUsers: number;
  /** Oxirgi 7 kunda bot bilan ishlaganlar. */
  activeBotUsers: number;
}

/**
 * Auditoriya: kanal obunachilari + bot foydalanuvchilari.
 *
 * `count()` agregatsiyasi hujjatlarni O'QIMAYDI (Firestore serverda
 * sanaydi), shuning uchun 10 000 foydalanuvchida ham arzon.
 */
export async function audienceStats(): Promise<AudienceStats> {
  const db = getAdminDb();
  const weekAgo = Date.now() - 7 * 86_400_000;

  const [subscribers, total, active] = await Promise.all([
    resolveChannelId()
      .then((id) => (id ? getChatMemberCount(id) : null))
      .catch(() => null),
    db
      .collection("botUsers")
      .count()
      .get()
      .then((s) => s.data().count)
      .catch(() => 0),
    db
      .collection("botSessions")
      .where("updatedAt", ">=", weekAgo)
      .count()
      .get()
      .then((s) => s.data().count)
      .catch(() => 0),
  ]);

  return { subscribers, botUsers: total, activeBotUsers: active };
}
