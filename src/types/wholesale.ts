/**
 * OPTOM MIJOZLAR.
 *
 * Do'konning optom xaridorlari (viloyatlardagi do'konlar). Ular
 * ro'yxatdan o'z-o'zicha o'tolmaydi: admin ro'yxatga qo'shadi, tizim
 * MAXFIY KALIT yaratadi va uni mijozga yuboradi. Mijoz `/optom`
 * sahifasida telefon + kalit kiritsa, hisobi `client` roliga o'tadi
 * va optom narxlarni ko'radi.
 *
 * Ro'yxat 1C/Odinis dan Excel orqali ham yuklanadi.
 */

export type WholesaleStatus =
  /** Kalit yaratilgan, mijoz hali faollashtirmagan. */
  | "invited"
  /** Mijoz kalitni kiritdi - hisobi optom bo'ldi. */
  | "active"
  /** Vaqtincha to'xtatilgan (kalit ishlamaydi). */
  | "blocked";

export const WHOLESALE_STATUS_LABELS: Record<WholesaleStatus, string> = {
  invited: "Kalit yuborilgan",
  active: "Faol",
  blocked: "To'xtatilgan",
};

export interface WholesaleClient {
  id: string;
  /** Qisqa tartib raqami — mijozga murojaat qilishda ishlatiladi (1, 2, 3...). */
  number: number;
  /** Mas'ul odamning ismi. */
  name: string;
  phone: string;
  /** Do'kon nomi ("Sardor santexnika"). */
  shopName: string;
  /** Manzil: viloyat, tuman, ko'cha. */
  address: string;
  telegramUsername?: string;
  /** Faollashtirish kaliti (ATY-XXXX-XXXX). Mijozga yuboriladi. */
  accessKey: string;
  status: WholesaleStatus;
  /** Faollashtirgandan keyin — sayt hisobining uid'i. */
  userId?: string | null;
  activatedAt?: number | null;
  /** Kalit oxirgi marta qachon yuborilgan (takror yubormaslik uchun). */
  invitedAt?: number | null;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/** Telefon raqamini bir ko'rinishga keltiradi: 998901234567. */
export function normalizeWholesalePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9) return `998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return digits;
  if (digits.length === 13 && digits.startsWith("9998")) return digits.slice(1);
  return digits;
}

/** Kalit ko'rinishi: ATY-7K3M-91QX (chalkashadigan harflar yo'q). */
export const ACCESS_KEY_PATTERN = /^ATY-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function normalizeAccessKey(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}
