/**
 * OMBOR HARAKATLARI (Firestore: `stockMoves`).
 *
 * Har bir zaxira o'zgarishi shu yerga yoziladi: kirim, sotuv, qaytish,
 * qo'lda chiqim (yo'qolgan/singan/sovg'a) va inventarizatsiya (sanoq).
 * Shu tarix bo'yicha "zaxira qayerga ketdi" degan savolga javob bor.
 */

export type StockMoveType =
  /** Kirim - yetkazib beruvchidan keldi. */
  | "in"
  /** Sotuv - buyurtma berildi. */
  | "sale"
  /** Qaytish - buyurtma bekor qilindi yoki mijoz qaytardi. */
  | "return"
  /** Chiqim - singan, yo'qolgan, sovg'a qilingan, xizmatga ketgan. */
  | "out"
  /** Sanoq (inventarizatsiya) - haqiqiy qoldiq bilan tenglashtirildi. */
  | "count";

export interface StockMove {
  id: string;
  productId: string;
  /** Mahsulot nomi (nusxa - keyin o'zgarsa ham tarix o'qiladi). */
  productName: string;
  productCode?: number | null;
  /** Turlari bo'lsa - qaysi tur (masalan "50x45|qora"). */
  variantId?: string | null;
  variantLabel?: string | null;
  type: StockMoveType;
  /** O'zgarish miqdori: musbat - qo'shildi, manfiy - kamaydi. */
  qty: number;
  stockBefore: number;
  stockAfter: number;
  /** Sotuvda - buyurtma ID si; kirimda - kirim hujjati ID si. */
  refId?: string | null;
  /** Izoh: "singan", "sanoq", yetkazib beruvchi nomi... */
  note?: string | null;
  /** Kim qildi (avtomatik yozuvlarda bo'sh). */
  adminUid?: string | null;
  adminName?: string | null;
  createdAt: number;
}

export const STOCK_MOVE_LABELS: Record<StockMoveType, string> = {
  in: "Kirim",
  sale: "Sotuv",
  return: "Qaytish",
  out: "Chiqim",
  count: "Sanoq",
};
