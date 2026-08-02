/** Chegirma promokodi (Firestore: `promoCodes/<KOD>`). */
export interface PromoCode {
  /** Hujjat ID'si bilan bir xil - doim KATTA harflarda. */
  code: string;
  /** "percent" - foizda, "fixed" - so'mda. */
  type: "percent" | "fixed";
  value: number;
  /** Shu summadan kam buyurtmaga kod ishlamaydi (0 - cheklovsiz). */
  minOrderAmount: number;
  /** Nechta marta ishlatish mumkin (null - cheksiz). */
  maxUses: number | null;
  usedCount: number;
  /** Amal qilish muddati (epoch millis, null - muddatsiz). */
  expiresAt: number | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * YETKAZISH HUDUDI: tuman/mahalla bo'yicha alohida narx.
 * Ro'yxat bo'sh bo'lsa - hamma joyga standart narx (`fee`) qo'llanadi.
 */
export interface DeliveryZone {
  /** Barqaror kalit (buyurtmada saqlanadi). */
  id: string;
  /** "Chilonzor", "Shahar tashqarisi 20 km gacha"... */
  name: string;
  fee: number;
  /** Shu summadan yuqori buyurtmaga shu hududda bepul (0 - umumiy qoida). */
  freeFrom?: number;
}

/** Yetkazib berish narxi sozlamalari (Firestore: `settings/delivery`). */
export interface DeliverySettings {
  /** Standart yetkazib berish narxi (so'm). */
  fee: number;
  /** Shu summadan yuqori buyurtmalarga yetkazish bepul (0 - hech qachon bepul emas). */
  freeFrom: number;
  /** O'chirilgan bo'lsa - yetkazish narxi qo'shilmaydi. */
  enabled: boolean;
  /** Hududlar (tuman bo'yicha narx). Bo'sh bo'lsa standart narx ishlaydi. */
  zones?: DeliveryZone[];
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  fee: 0,
  freeFrom: 0,
  enabled: false,
  zones: [],
};
