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

/**
 * Javobni tekshiradi va jumboqni "ishlatilgan" qiladi (o'chiradi).
 * Bir jumboq faqat bitta saqlashga yetadi.
 */
export async function consumeChallenge(params: {
  id: string;
  answer: number;
  uid: string;
}): Promise<boolean> {
  const ref = getAdminDb().collection("adminChallenges").doc(params.id);
  const snap = await ref.get();
  const data = snap.data() as { answer?: number; uid?: string; expiresAt?: number } | undefined;

  // Har qanday holatda hujjat o'chadi: noto'g'ri javob bilan qayta-qayta
  // urinib ko'rishning oldi olinadi (yangi jumboq so'rash kerak bo'ladi).
  await ref.delete().catch(() => {});

  if (!snap.exists || !data) return false;
  if ((data.expiresAt ?? 0) < Date.now()) return false;
  if (data.uid !== params.uid) return false;
  return data.answer === params.answer;
}
