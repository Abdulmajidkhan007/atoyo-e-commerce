export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  /** 1-5 yulduz */
  rating: number;
  comment: string;
  createdAt: number;
  /**
   * BOSH SAHIFADAGI "MIJOZLAR FIKRI" ga admin tanlaganmi
   * (`/admin/sahifalar`). Faqat HAQIQIY sharhdan — soxta sharh
   * yozilmaydi. Mijoz sharhini qayta yozsa `saveReview` hujjatni
   * to'liq almashtiradi va belgi TUSHIB QOLADI: yangi matnni admin
   * qayta ko'rib chiqadi.
   */
  featured?: boolean;
}
