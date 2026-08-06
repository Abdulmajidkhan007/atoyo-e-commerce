import "server-only";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * OAUTH "STATE" (CSRF himoyasi) - COOKIE'DA EMAS, BAZADA.
 *
 * NEGA: sayt Firebase Hosting orqali ochiladi va u backendga FAQAT
 * `__session` nomli cookie'ni uzatadi - qolgan hamma cookie yo'lda
 * tashlab ketiladi. Shu sababli Google/Facebook'dan qaytganda
 * `yt_oauth_state` cookie'si serverga yetib bormasdi va ulanish
 * "So'rov tasdiqlanmadi (state)" xatosi bilan to'xtardi.
 *
 * Endi `state` Firestore'da (`oauthStates`, faqat server o'qiydi)
 * saqlanadi va u KIM boshlaganiga bog'lanadi: qaytishda o'sha odam
 * (o'sha `uid`) bo'lmasa qabul qilinmaydi. Bir marta ishlatiladi va
 * darhol o'chiriladi, 10 daqiqadan keyin esa amal qilmaydi.
 */
const COLLECTION = "oauthStates";
const TTL_MS = 10 * 60 * 1000;

export type OAuthProvider = "youtube" | "meta";

interface StoredState {
  provider: OAuthProvider;
  uid: string;
  createdAt: number;
  expiresAt: number;
}

/** Ulanishni boshlashda: yangi bir martalik `state` yaratadi. */
export async function createOAuthState(provider: OAuthProvider, uid: string): Promise<string> {
  const db = getAdminDb();
  const state = randomUUID();
  const now = Date.now();

  await db.collection(COLLECTION).doc(state).set({
    provider,
    uid,
    createdAt: now,
    expiresAt: now + TTL_MS,
  } satisfies StoredState);

  // Eskilarini tozalab ketamiz (bitta oraliq filtr - indeks kerak emas).
  void sweepExpired(now).catch(() => {});
  return state;
}

/**
 * Qaytishda: `state` haqiqiyligini tekshiradi va uni O'CHIRADI
 * (ikkinchi marta ishlatib bo'lmaydi).
 */
export async function consumeOAuthState(
  provider: OAuthProvider,
  state: string | null,
  uid: string
): Promise<boolean> {
  if (!state) return false;

  const ref = getAdminDb().collection(COLLECTION).doc(state);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data() as Partial<StoredState>;
  await ref.delete().catch(() => {});

  if (data.provider !== provider) return false;
  if (data.uid !== uid) return false;
  if (typeof data.expiresAt === "number" && data.expiresAt < Date.now()) return false;
  return true;
}

async function sweepExpired(now: number): Promise<void> {
  const snap = await getAdminDb()
    .collection(COLLECTION)
    .where("expiresAt", "<", now)
    .limit(20)
    .get();
  if (snap.empty) return;
  const batch = getAdminDb().batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
