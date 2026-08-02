export type OrderStatus = "pending" | "approved" | "delivering" | "completed" | "cancelled";

export interface OrderItem {
  productId: string;
  /** Tanlangan tur (o'lcham/rang/qalinlik) kaliti - turlari bo'lsa. */
  variantId?: string | null;
  /** "50x60 • 0.3mm" - chekda va guruh xabarida shu ko'rinadi. */
  variantLabel?: string | null;
  name: string;
  price: number;
  /**
   * Sotilgan paytdagi TANNARX (nusxa). Keyinchalik mahsulot tannarxi
   * o'zgarsa ham eski buyurtmaning foydasi o'zgarmaydi.
   */
  costPrice?: number | null;
  quantity: number;
  thumbnailUrl: string;
}

export interface OrderLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Order {
  id: string;
  userId: string | null;
  /** Buyurtma bergan foydalanuvchi emaili (saytdan kelgan buyurtmalarda). */
  customerEmail?: string | null;
  customerName: string;
  phoneNumber: string;
  items: OrderItem[];
  /** Mahsulotlar summasi (chegirma va yetkazishsiz). */
  subtotal?: number;
  /** Qo'llangan promokod (KATTA harflarda) va u bergan chegirma. */
  promoCode?: string | null;
  discountAmount?: number;
  /** Yetkazib berish narxi (0 - bepul yoki o'chirilgan). */
  deliveryFee?: number;
  /** Tanlangan yetkazish hududi (sozlamalardagi ro'yxatdan). */
  deliveryZoneId?: string | null;
  deliveryZoneName?: string | null;
  /** Mijoz to'laydigan yakuniy summa: subtotal - discountAmount + deliveryFee. */
  totalAmount: number;
  currency: "UZS";
  location: OrderLocation | null;
  /** Lokatsiya yuborish qiyin bo'lsa - qo'lda yozilgan manzil. */
  deliveryAddress: string | null;
  /** To'lov usuli: naqd (yetkazilganda) yoki onlayn (karta). */
  paymentMethod: "cash" | "online";
  /** Onlayn to'lov holati (naqd uchun doim "not_required"). */
  paymentStatus: "not_required" | "pending" | "paid" | "failed";
  status: OrderStatus;
  /** Bekor qilinganda zaxira bir marta qaytariladi - ikki marta qaytmasligi uchun bayroq. */
  stockReturned: boolean;
  /**
   * QAYTARILGAN qatorlar (qisman qaytarish ham mumkin). Bekor qilishdan
   * farqi: buyurtma allaqachon berilgan/yetkazilgan, mijoz mahsulotni
   * qaytardi - zaxira va tushum shu qatorlar bo'yicha tuzatiladi.
   */
  returnedItems?: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    price: number;
    returnedAt: number;
  }[];
  /** Qaytarilgan umumiy summa. */
  refundAmount?: number;
  returnReason?: string | null;
  /** Guruhga yuborilgan Telegram xabarining message_id (statusni tugmalar orqali tahrirlash uchun) */
  telegramMessageId: number | null;
  /** Buyurtma Telegram botdan berilgan bo'lsa - mijozning shaxsiy chat ID'si (status o'zgarishini DM qilish uchun) */
  customerChatId: number | null;
  // ---- Payme Merchant API tranzaksiya holati (webhook yozadi) ----
  paymeTransactionId?: string | null;
  /** 1=yaratilgan, 2=bajarilgan, -1/-2=bekor qilingan */
  paymeState?: number;
  paymeCreateTime?: number;
  paymePerformTime?: number;
  paymeCancelTime?: number;
  // ---- Click SHOP API ----
  clickTransId?: string;
  createdAt: number;
  updatedAt: number;
}
