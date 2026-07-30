/** Bitta kirim qatori (mahsulot va nechta kelgani). */
export interface StockIntakeItem {
  productId: string;
  /** Sotish turi (dona/metr/kg...) - kirim paytidagi holat. */
  unit?: string;
  /** Kirim paytidagi mahsulot nomi (mahsulot keyin o'chirilsa ham qoladi). */
  name: string;
  qty: number;
  /** Kirimgacha bo'lgan zaxira - o'zgarishni ko'rish uchun. */
  stockBefore: number;
  /** Kirim bilan birga o'rnatilgan yangi sotuv narxi (null - o'zgarmagan). */
  price: number | null;
  supplier: string | null;
}

/** Kirim qayerdan kiritilgani. */
export type IntakeSource = "panel" | "telegram";

/** MAHSULOT KIRIMI hujjati (Firestore: `stockIntakes`). */
export interface StockIntake {
  id: string;
  adminUid: string;
  adminEmail: string | null;
  /** Kim kiritgani (ko'rinadigan nom): admin emaili yoki Telegram ismi. */
  adminName?: string | null;
  /** Qayerdan: admin panel yoki Telegram "Kirim" topic'i. */
  source?: IntakeSource;
  /** Yangi mahsulot yaratilgan kirimmi yoki mavjudining zaxirasi to'ldirilganmi. */
  kind?: "new" | "restock";
  items: StockIntakeItem[];
  totalQty: number;
  createdAt: number;
}
