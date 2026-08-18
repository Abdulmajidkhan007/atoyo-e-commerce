import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { removeFromIndex, indexProduct } from "@/lib/search/engine";
import type { Product } from "@/types/product";

/**
 * O'CHIRILGANLAR SAVATI (30 kun).
 *
 * Ommaviy o'chirish bir bosishda 200 tagacha mahsulotni yo'q qilardi va
 * qaytarib bo'lmasdi - bir marta "rasmsizlar" filtri bilan o'chirilgach
 * ularning rasmini ham, ma'lumotini ham tiklashning iloji qolmagan edi.
 *
 * Endi o'chirilgan mahsulot AVVAL `deletedProducts` ga ko'chiriladi:
 *   • 30 kun ichida bir bosishda tiklanadi (rasm havolalari ham
 *     saqlanadi - Storage'dagi fayllar o'chirilmaydi);
 *   • muddat o'tgach avtomatik butunlay o'chadi (ro'yxat ochilganda
 *     tozalanadi - alohida cron kerak emas);
 *   • xohlasa admin muddatdan oldin ham butunlay o'chira oladi.
 */

const TRASH = "deletedProducts";
const PRODUCTS = "products";

/** Necha kun saqlanadi. */
export const TRASH_DAYS = 30;
const TTL_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;

/** Firestore bir tranzaksiyada 500 ta amalni ko'taradi. */
const BATCH = 200;

export interface TrashedProduct extends Product {
  deletedAt: number;
  deletedBy: string;
}

/**
 * Mahsulotlarni savatga ko'chiradi (hujjat `products` dan o'chadi).
 * Qaytaradi: nechtasi ko'chirildi.
 */
export async function moveToTrash(ids: string[], deletedBy: string): Promise<number> {
  if (ids.length === 0) return 0;
  const db = getAdminDb();
  let moved = 0;

  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const refs = chunk.map((id) => db.collection(PRODUCTS).doc(id));
    const snaps = await db.getAll(...refs);

    const batch = db.batch();
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const product = { id: snap.id, ...snap.data() } as Product;
      batch.set(db.collection(TRASH).doc(snap.id), {
        ...product,
        deletedAt: Date.now(),
        deletedBy,
      });
      batch.delete(snap.ref);
      moved += 1;
    }
    await batch.commit();
    // Tashqi qidiruv indeksidan ham olib tashlanadi (best-effort).
    await Promise.all(chunk.map((id) => removeFromIndex(id).catch(() => {})));
  }

  return moved;
}

/**
 * Savatdagi ro'yxat. Ochilganda muddati o'tganlari tozalanadi -
 * shuning uchun alohida jadval (cron) kerak emas.
 */
export async function listTrash(limit = 100): Promise<TrashedProduct[]> {
  const db = getAdminDb();
  await purgeExpired().catch(() => {});

  const snap = await db.collection(TRASH).orderBy("deletedAt", "desc").limit(limit).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TrashedProduct);
}

/** Savatdagi mahsulotlar soni (tugma yonida ko'rsatiladi). */
export async function countTrash(): Promise<number> {
  try {
    const snap = await getAdminDb().collection(TRASH).count().get();
    return snap.data().count;
  } catch {
    return 0;
  }
}

/**
 * TIKLASH: hujjat `products` ga qaytadi. Mahsulot SAYTDA YOPIQ holda
 * tiklanadi (`isActive: false`) - tasodifan o'chirilgan minglab
 * mahsulot birdaniga katalogga qaytib, kanalga e'lon bo'lib ketmasin.
 */
export async function restoreFromTrash(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = getAdminDb();
  let restored = 0;

  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const refs = chunk.map((id) => db.collection(TRASH).doc(id));
    const snaps = await db.getAll(...refs);

    const batch = db.batch();
    const revived: Product[] = [];
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() as TrashedProduct;
      const { deletedAt: _deletedAt, deletedBy: _deletedBy, ...product } = data;
      const restoredProduct = {
        ...product,
        id: snap.id,
        isActive: false,
        updatedAt: Date.now(),
      } as Product;
      batch.set(db.collection(PRODUCTS).doc(snap.id), restoredProduct);
      batch.delete(snap.ref);
      revived.push(restoredProduct);
      restored += 1;
    }
    await batch.commit();
    await Promise.all(revived.map((product) => indexProduct(product).catch(() => {})));
  }

  return restored;
}

/** Butunlay o'chirish (qaytarib bo'lmaydi). */
export async function purgeFromTrash(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = getAdminDb();
  let purged = 0;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = db.batch();
    for (const id of ids.slice(i, i + BATCH)) {
      batch.delete(db.collection(TRASH).doc(id));
      purged += 1;
    }
    await batch.commit();
  }
  return purged;
}

/** Muddati o'tganlarini tozalaydi (bir chaqiruvda 200 tagacha). */
export async function purgeExpired(): Promise<number> {
  const db = getAdminDb();
  const snap = await db
    .collection(TRASH)
    .where("deletedAt", "<", Date.now() - TTL_MS)
    .limit(BATCH)
    .get();
  if (snap.empty) return 0;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}
