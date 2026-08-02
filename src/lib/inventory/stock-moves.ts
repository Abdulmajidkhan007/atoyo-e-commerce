import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { StockMove, StockMoveType } from "@/types/inventory";

/**
 * OMBOR HARAKATLARINI YOZISH.
 *
 * Zaxira o'zgargan har bir joyda (kirim, buyurtma, bekor qilish, qo'lda
 * chiqim, sanoq) shu funksiya chaqiriladi. Yozuv BEST-EFFORT: tarix
 * yozilmasa ham asosiy amal (buyurtma, kirim) bajarilaveradi.
 */

const COLLECTION = "stockMoves";

export interface StockMoveInput {
  productId: string;
  productName: string;
  productCode?: number | null;
  variantId?: string | null;
  variantLabel?: string | null;
  type: StockMoveType;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  refId?: string | null;
  note?: string | null;
  adminUid?: string | null;
  adminName?: string | null;
}

export async function recordStockMoves(moves: StockMoveInput[]): Promise<void> {
  if (moves.length === 0) return;
  try {
    const db = getAdminDb();
    const batch = db.batch();
    const now = Date.now();
    for (const move of moves) {
      const ref = db.collection(COLLECTION).doc();
      const doc: StockMove = {
        id: ref.id,
        createdAt: now,
        productCode: move.productCode ?? null,
        variantId: move.variantId ?? null,
        variantLabel: move.variantLabel ?? null,
        refId: move.refId ?? null,
        note: move.note ?? null,
        adminUid: move.adminUid ?? null,
        adminName: move.adminName ?? null,
        ...move,
      };
      batch.set(ref, doc);
    }
    await batch.commit();
  } catch (error) {
    console.error("Ombor harakatini yozishda xato:", error);
  }
}

/** Oxirgi harakatlar (ombor sahifasi uchun). */
export async function getStockMoves(options: {
  productId?: string;
  type?: StockMoveType;
  limit?: number;
}): Promise<StockMove[]> {
  const limit = Math.min(options.limit ?? 50, 200);
  let query = getAdminDb().collection(COLLECTION).orderBy("createdAt", "desc").limit(limit);
  if (options.productId) {
    query = getAdminDb()
      .collection(COLLECTION)
      .where("productId", "==", options.productId)
      .orderBy("createdAt", "desc")
      .limit(limit);
  }

  const snap = await query.get();
  const moves = snap.docs.map((doc) => doc.data() as StockMove);
  // Turi bo'yicha filtr - indeks talab qilmasligi uchun mijoz tomonda.
  return options.type ? moves.filter((move) => move.type === options.type) : moves;
}
