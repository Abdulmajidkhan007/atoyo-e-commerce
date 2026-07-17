export type TelegramTopicKey = "orders" | "contact" | "subscribers" | "actions";

export interface TelegramTopicConfig {
  orders: number;
  contact: number;
  subscribers: number;
  /** Sayt/botdagi barcha hodisalar (ro'yxatdan o'tish, o'chirish, kirim...) tushadigan topic. */
  actions: number;
}

/** Telegram webhook orqali keladigan callback_query payloadi (inline tugmalar) */
export interface OrderStatusCallbackData {
  action: "order_status";
  orderId: string;
  status: "approved" | "delivering" | "completed";
}
