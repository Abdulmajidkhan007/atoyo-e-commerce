export type OrderStatus = "pending" | "approved" | "delivering" | "completed" | "cancelled";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
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
  customerName: string;
  phoneNumber: string;
  items: OrderItem[];
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
  /** Guruhga yuborilgan Telegram xabarining message_id (statusni tugmalar orqali tahrirlash uchun) */
  telegramMessageId: number | null;
  /** Buyurtma Telegram botdan berilgan bo'lsa - mijozning shaxsiy chat ID'si (status o'zgarishini DM qilish uchun) */
  customerChatId: number | null;
  createdAt: number;
  updatedAt: number;
}
