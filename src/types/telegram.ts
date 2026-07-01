export type TelegramTopicKey = "orders" | "contact" | "subscribers";

export interface TelegramTopicConfig {
  orders: number;
  contact: number;
  subscribers: number;
}

/** Telegram webhook orqali keladigan callback_query payloadi (inline tugmalar) */
export interface OrderStatusCallbackData {
  action: "order_status";
  orderId: string;
  status: "approved" | "delivering" | "completed";
}
