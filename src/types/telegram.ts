export type TelegramTopicKey =
  | "orders"
  | "contact"
  | "subscribers"
  | "actions"
  | "intake"
  | "wholesale";

export interface TelegramTopicConfig {
  orders: number;
  contact: number;
  subscribers: number;
  /** Sayt/botdagi barcha hodisalar (ro'yxatdan o'tish, o'chirish, kirim...) tushadigan topic. */
  actions: number;
  /**
   * "Kirim" topic'i: admin shu yerga rasm(lar) + izoh tashlasa, bot
   * mahsulotni katalogga qo'shadi (src/lib/telegram/product-intake.ts).
   */
  intake: number;
  /**
   * "Optom" topic'i: optom mijoz qo'shilganda, kalit yuborilganda va
   * mijoz faollashganda xabar shu yerga tushadi.
   */
  wholesale: number;
}

/** Telegram webhook orqali keladigan callback_query payloadi (inline tugmalar) */
export interface OrderStatusCallbackData {
  action: "order_status";
  orderId: string;
  status: "approved" | "delivering" | "completed";
}
