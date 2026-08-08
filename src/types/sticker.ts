/**
 * TELEGRAM STIKERLARI.
 *
 * Bot ma'lum daqiqalarda stiker yuboradi: salomlashuv, buyurtma
 * qabul qilindi, holat o'zgardi, yordamchi o'ylayotgan payt va h.k.
 * Har bir "daqiqa" - bitta SLOT; slotga stiker biriktiriladi
 * (`file_id` saqlanadi). Slot bo'sh bo'lsa stiker yuborilmaydi -
 * bot avvalgidek matn bilan ishlayveradi.
 */

export type StickerSlot =
  | "start"
  | "loading"
  | "order_created"
  | "order_accepted"
  | "order_delivering"
  | "order_completed"
  | "order_cancelled"
  | "cart_added"
  | "empty"
  | "thanks"
  | "error";

export const STICKER_SLOTS: StickerSlot[] = [
  "start",
  "loading",
  "order_created",
  "order_accepted",
  "order_delivering",
  "order_completed",
  "order_cancelled",
  "cart_added",
  "empty",
  "thanks",
  "error",
];

/** Slot nomi va qachon yuborilishi (admin panelda ko'rinadi). */
export const STICKER_SLOT_INFO: Record<StickerSlot, { label: string; when: string }> = {
  start: { label: "Salomlashuv", when: "Mijoz botda /start bosganda" },
  loading: {
    label: "Kutish (loading)",
    when: "Yordamchi javob tayyorlayotganda — javob kelgach o'chiriladi",
  },
  order_created: { label: "Buyurtma qabul qilindi", when: "Mijoz buyurtmani rasmiylashtirganda" },
  order_accepted: { label: "Buyurtma tasdiqlandi", when: "Holat “qabul qilindi” ga o'tganda" },
  order_delivering: { label: "Yo'lda", when: "Holat “yetkazishda” ga o'tganda" },
  order_completed: { label: "Yetkazildi", when: "Buyurtma yakunlanganda" },
  order_cancelled: { label: "Bekor qilindi", when: "Buyurtma bekor qilinganda" },
  cart_added: { label: "Savatga qo'shildi", when: "Mijoz mahsulotni savatga solganda" },
  empty: { label: "Bo'sh natija", when: "Qidiruvda hech narsa topilmaganda" },
  thanks: { label: "Rahmat", when: "Mijoz rahmat aytganda / suhbat oxirida" },
  error: { label: "Xatolik", when: "Kutilmagan xato yuz berganda" },
};

export interface StickerSettings {
  /**
   * Bot O'ZI yaratgan to'plamning qisqa nomi (`..._by_<bot>`).
   * Yangi stiker shu to'plamga qo'shiladi.
   */
  packName: string;
  /**
   * To'plam egasining Telegram user ID si. Telegram to'plam yaratishda
   * egasini so'raydi - odatda do'kon egasi.
   */
  ownerUserId: number | null;
  /** Ko'rib chiqish uchun qo'shimcha to'plamlar (mavjud "Atoyo stickers"). */
  extraPacks: string[];
  /** Slot → stiker `file_id`. Bo'sh qator - stiker yo'q. */
  slots: Partial<Record<StickerSlot, string>>;
}

export const DEFAULT_STICKER_SETTINGS: StickerSettings = {
  packName: "",
  ownerUserId: null,
  extraPacks: [],
  slots: {},
};

/** Bitta stikerning admin panelda ko'rsatiladigan ko'rinishi. */
export interface StickerInfo {
  fileId: string;
  emoji: string;
  isAnimated: boolean;
  isVideo: boolean;
  /** Ko'rish uchun rasm manzili (server proksisi orqali). */
  previewUrl: string;
}

/** Stiker yasash shabloni (statik PNG). */
export type StickerTemplate = "circle" | "badge" | "banner";

export const STICKER_TEMPLATE_LABELS: Record<StickerTemplate, string> = {
  circle: "Doira (do'kon uslubi)",
  badge: "Nishon (to'rtburchak)",
  banner: "Lenta (keng yozuv)",
};

/**
 * ANIMATSIYALI STIKER SHABLONLARI.
 *
 * Telegram `.tgs` (Lottie) formatida MATN QATLAMI ishlatilmaydi -
 * shuning uchun animatsiyali stikerda yozuv bo'lmaydi, harakat
 * do'kon ikonkasi va logotipi ustiga quriladi.
 */
export type StickerAnimation =
  | "puls"
  | "aylanish"
  | "chizish"
  | "sakrash"
  | "tebranish"
  | "tomchi";

export const STICKER_ANIMATIONS: StickerAnimation[] = [
  "puls",
  "aylanish",
  "chizish",
  "sakrash",
  "tebranish",
  "tomchi",
];

export const STICKER_ANIMATION_LABELS: Record<StickerAnimation, string> = {
  puls: "Puls (nafas olish)",
  aylanish: "Aylanuvchi halqa",
  chizish: "Chizilib borish",
  sakrash: "Sakrash",
  tebranish: "Tebranish",
  tomchi: "Tomchi va to'lqin",
};

export const STICKER_ANIMATION_HINTS: Record<StickerAnimation, string> = {
  puls: "Ikonka asta kattalashib-kichrayadi. Salomlashuv va “rahmat” uchun mos.",
  aylanish: "Ikonka atrofida oltin halqa aylanadi. “Kutib turing” slotiga eng mos.",
  chizish: "Ikonka chiziqlari ko'z oldida chiziladi. “Tasdiqlandi” uchun chiroyli.",
  sakrash: "Ikonka sakrab tushadi. “Savatga qo'shildi” uchun.",
  tebranish: "Ikonka chapga-o'ngga tebranadi. “Xatolik” yoki diqqat uchun.",
  tomchi: "Suv tomchisi tushib, to'lqin tarqaladi. Ikonka tanlanmaydi.",
};

/** Ikonka tanlanmaydigan shablonlar. */
export const ANIMATIONS_WITHOUT_ICON: StickerAnimation[] = ["tomchi"];
