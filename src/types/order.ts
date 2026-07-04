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
  status: OrderStatus;
  /** Guruhga yuborilgan Telegram xabarining message_id (statusni tugmalar orqali tahrirlash uchun) */
  telegramMessageId: number | null;
  /** Buyurtma Telegram botdan berilgan bo'lsa - mijozning shaxsiy chat ID'si (status o'zgarishini DM qilish uchun) */
  customerChatId: number | null;
  createdAt: number;
  updatedAt: number;
}
