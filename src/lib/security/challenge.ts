import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * "JUMBOQ" HIMOYASI - sozlamalarni (topic ID lari, kanal, bot tokeni)
 * o'zgartirishdan oldin so'raladigan bir martalik savol.
 *
 * Maqsad: admin panelga kirgan (yoki ochiq qolgan kompyuterda o'tirgan)
 * har kim bir bosishda muhim sozlamani o'zgartirib yubormasin. Bu parol
 * o'rnini bosmaydi - u qo'shimcha "rostdan ham shuni xohlaysizmi?"
 * to'sig'i, lekin faqat UI'da emas, SERVER tomonda tekshiriladi:
 * jumboqsiz yoki noto'g'ri javob bilan kelgan so'rov rad etiladi.
 *
 * Javob Firestore'da (`adminChallenges/{id}`) turadi, clientga hech
 * qachon yuborilmaydi, 5 daqiqadan keyin kuchini yo'qotadi va bir marta
 * ishlatilgach o'chiriladi.
 */

const TTL_MS = 5 * 60 * 1000;

/**
 * JUMBOQ YECHILGANDAN KEYINGI "ISHONCH OYNASI".
 *
 * Ilgari HAR BIR saqlashda jumboq chiqardi: admin bitta sozlamani
 * bir necha marta tuzatsa oyna o'nlab marta ochilardi va ish
 * to'xtab qolardi. Endi bir marta to'g'ri javob berilsa - shu uid
 * uchun 10 daqiqa davomida qayta so'ralmaydi.
 *
 * Himoya saqlanib qoladi: oyna VAQT bilan cheklangan, foydalanuvchiga
 * bog'langan va SERVER tomonda tekshiriladi - clientni aldab bo'lmaydi.
 */
const GRANT_MS = 10 * 60 * 1000;
const GRANT_COLLECTION = "adminChallengeGrants";

export interface Challenge {
  id: string;
  question: string;
}

/** Oddiy arifmetik savol (qo'shish yoki ko'paytirish). */
export async function createChallenge(uid: string): Promise<Challenge> {
  const useMultiplication = randomInt(0, 2) === 1;
  const a = useMultiplication ? randomInt(3, 13) : randomInt(11, 90);
  const b = useMultiplication ? randomInt(3, 13) : randomInt(11, 90);

  const answer = useMultiplication ? a * b : a + b;
  const question = useMultiplication ? `${a} × ${b} = ?` : `${a} + ${b} = ?`;

  const id = randomBytes(12).toString("hex");
  await getAdminDb()
    .collection("adminChallenges")
    .doc(id)
    .set({ answer, uid, expiresAt: Date.now() + TTL_MS, createdAt: Date.now() });

  return { id, question };
}

/** Shu uid uchun ishonch oynasi ochiqmi (jumboq so'ralmasin). */
export async function hasActiveGrant(uid: string): Promise<boolean> {
  try {
    const snap = await getAdminDb().collection(GRANT_COLLECTION).doc(uid).get();
    const until = (snap.data()?.until as number | undefined) ?? 0;
    return until > Date.now();
  } catch {
    // O'qib bo'lmasa - jumboq so'raladi (xavfsiz tomonga og'amiz).
    return false;
  }
}

/**
 * Javobni tekshiradi va jumboqni "ishlatilgan" qiladi (o'chiradi).
 *
 * To'g'ri javobdan keyin ishonch oynasi ochiladi; ochiq oyna bo'lsa
 * `id`/`answer` umuman tekshirilmaydi (client jumboq so'ramagan
 * bo'ladi).
 */
export async function consumeChallenge(params: {
  id: string;
  answer: number;
  uid: string;
}): Promise<boolean> {
  if (await hasActiveGrant(params.uid)) return true;

  const ref = getAdminDb().collection("adminChallenges").doc(params.id);
  const snap = await ref.get();
  const data = snap.data() as { answer?: number; uid?: string; expiresAt?: number } | undefined;

  // Har qanday holatda hujjat o'chadi: noto'g'ri javob bilan qayta-qayta
  // urinib ko'rishning oldi olinadi (yangi jumboq so'rash kerak bo'ladi).
  await ref.delete().catch(() => {});

  if (!snap.exists || !data) return false;
  if ((data.expiresAt ?? 0) < Date.now()) return false;
  if (data.uid !== params.uid) return false;
  if (data.answer !== params.answer) return false;

  // To'g'ri javob - 10 daqiqalik oyna ochamiz.
  await getAdminDb()
    .collection(GRANT_COLLECTION)
    .doc(params.uid)
    .set({ until: Date.now() + GRANT_MS, updatedAt: Date.now() })
    .catch(() => {});
  return true;
}
