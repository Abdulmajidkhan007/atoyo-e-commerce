import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";

/**
 * MAHSULOT RAQAMI (`code`).
 *
 * Firestore hujjat ID si tasodifiy harflardan iborat (`Xk3mQ2...`) - uni
 * telefonda o'qish ham, botga yozish ham qiyin. Shuning uchun har bir
 * mahsulotga qo'shimcha TARTIB RAQAMI beriladi: 1, 2, 3, ... U guruhga
 * keladigan xabarlarda, kanal postida va admin panelda ko'rsatiladi,
 * bot buyruqlarida ham shu raqamni yozish kifoya (`/narx 12 50000`).
 *
 * Hujjat ID si o'zgarmaydi (unga buyurtmalar, kirim tarixi, rasm
 * papkalari bog'langan) - raqam uning yoniga qo'shiladi.
 *
 * Hisoblagich: `metadata/counters.productCode`. Raqam tranzaksiyada
 * ajratiladi, ya'ni bir vaqtda bir nechta mahsulot qo'shilsa ham
 * takrorlanmaydi.
 */

const COUNTER_DOC = "metadata/counters";

/** Navbatdagi bitta raqamni ajratadi (birinchi mahsulot - 1). */
export async function nextProductCode(): Promise<number> {
  return (await reserveProductCodes(1))[0]!;
}

/**
 * Ketma-ket `count` ta raqam ajratadi (import kabi ommaviy qo'shishlar
 * uchun - har bir qator uchun alohida tranzaksiya qilmaslik maqsadida).
 */
export async function reserveProductCodes(count: number): Promise<number[]> {
  const db = getAdminDb();
  const ref = db.doc(COUNTER_DOC);

  const first = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = Number((snap.data() as { productCode?: number } | undefined)?.productCode ?? 0);
    const start = (Number.isFinite(current) ? current : 0) + 1;
    tx.set(ref, { productCode: start + count - 1 }, { merge: true });
    return start;
  });

  return Array.from({ length: count }, (_, i) => first + i);
}

/**
 * Hisoblagichni mavjud eng katta raqamdan kam bo'lmasligiga keltiradi
 * (eski mahsulotlarga raqam berilgandan keyin chaqiriladi).
 */
export async function bumpProductCodeCounter(to: number): Promise<void> {
  const db = getAdminDb();
  const ref = db.doc(COUNTER_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = Number((snap.data() as { productCode?: number } | undefined)?.productCode ?? 0);
    if (to > current) tx.set(ref, { productCode: to }, { merge: true });
  });
}

/** Raqam bo'yicha mahsulotni topadi (bot buyruqlari uchun). */
export async function findProductIdByCode(code: number): Promise<string | null> {
  const snap = await getAdminDb()
    .collection("products")
    .where("code", "==", code)
    .limit(1)
    .get()
    .catch(() => null);
  return snap?.docs[0]?.id ?? null;
}
