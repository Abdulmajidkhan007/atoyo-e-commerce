/**
 * KARTAGA O'TKAZMA SOZLAMASI (`settings/payment`).
 *
 * Onlayn to'lov (Payme/Click) kalitlari kelguncha vaqtinchalik yo'l:
 * mijoz do'kon kartasiga o'zi pul o'tkazadi va chek skrinshotini
 * yuklaydi. Karta raqami SIR EMAS — u mijozga ko'rsatish uchun.
 *
 * Bu yerda MIJOZNING kartasi hech qachon saqlanmaydi.
 */
export interface TransferSettings {
  enabled: boolean;
  /** Pul qabul qilinadigan karta (faqat raqamlar, 16 ta). */
  cardNumber: string;
  /** Karta egasi — mijoz o'tkazishda ekranda shu ismni ko'radi. */
  cardHolder: string;
  /** Bank / tizim nomi ("Uzcard", "Humo", "Kapitalbank"...). */
  bankName: string;
  /** Qo'shimcha izoh (bo'sh — avtomatik matn). */
  note: string;
}

export const DEFAULT_TRANSFER_SETTINGS: TransferSettings = {
  enabled: false,
  cardNumber: "",
  cardHolder: "",
  bankName: "",
  note: "",
};

/** "8600123412341234" → "8600 1234 1234 1234". */
export function formatCardNumber(digits: string): string {
  return digits.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** O'tkazma haqiqatan ishlaydimi: yoqilgan VA karta to'liq. */
export function isTransferUsable(settings: Pick<TransferSettings, "enabled" | "cardNumber"> | null | undefined): boolean {
  return Boolean(settings?.enabled) && /^\d{16}$/.test(settings?.cardNumber ?? "");
}
