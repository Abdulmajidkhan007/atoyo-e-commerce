/** Bitta kirim qatori (mahsulot va nechta kelgani). */
export interface StockIntakeItem {
  productId: string;
  /** Kirim paytidagi mahsulot nomi (mahsulot keyin o'chirilsa ham qoladi). */
  name: string;
  qty: number;
  /** Kirimgacha bo'lgan zaxira - o'zgarishni ko'rish uchun. */
  stockBefore: number;
  /** Kirim bilan birga o'rnatilgan yangi sotuv narxi (null - o'zgarmagan). */
  price: number | null;
  supplier: string | null;
}

/** MAHSULOT KIRIMI hujjati (Firestore: `stockIntakes`). */
export interface StockIntake {
  id: string;
  adminUid: string;
  adminEmail: string | null;
  items: StockIntakeItem[];
  totalQty: number;
  createdAt: number;
}
