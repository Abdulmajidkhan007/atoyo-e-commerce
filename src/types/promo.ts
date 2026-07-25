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

/** Yetkazib berish narxi sozlamalari (Firestore: `settings/delivery`). */
export interface DeliverySettings {
  /** Standart yetkazib berish narxi (so'm). */
  fee: number;
  /** Shu summadan yuqori buyurtmalarga yetkazish bepul (0 - hech qachon bepul emas). */
  freeFrom: number;
  /** O'chirilgan bo'lsa - yetkazish narxi qo'shilmaydi. */
  enabled: boolean;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  fee: 0,
  freeFrom: 0,
  enabled: false,
};
