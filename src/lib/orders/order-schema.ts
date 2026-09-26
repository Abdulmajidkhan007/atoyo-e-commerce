import { z, type ZodError } from "zod";
import { normalizePhone, isValidName } from "@/lib/validation";

/**
 * SAYTDAN KELADIGAN BUYURTMA SXEMASI — `/api/orders` (kirgan mijoz)
 * va `/api/orders/quick` (1 klikda, mehmon) uchun BITTA manba.
 * Ikki joyda alohida yozilsa, bittasi yangilanib ikkinchisi qolib
 * ketardi (loyihada bunday nosozlik ikki marta bo'lgan).
 *
 * Narx (`price`) bu yerda faqat ma'lumot uchun — server uni bazadan
 * QAYTA hisoblaydi (`createOrder`).
 */
export const orderItemSchema = z.object({
  productId: z.string().min(1).max(200),
  variantId: z.string().max(200).nullable().optional(),
  name: z.string().min(1).max(300),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive().max(10_000),
  thumbnailUrl: z.string().max(2000),
});

export const orderSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Ism kamida 2 harf bo'lsin")
    .max(120)
    .refine(isValidName, { message: "Ism noto'g'ri" }),
  phoneNumber: z
    .string()
    .transform((v) => normalizePhone(v))
    .refine((v): v is string => v !== null, { message: "Telefon raqam noto'g'ri" }),
  items: z.array(orderItemSchema).min(1).max(100),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      address: z.string().max(500).optional(),
    })
    .nullable()
    .optional(),
  deliveryAddress: z.string().trim().max(500).nullable().optional(),
  paymentMethod: z.enum(["cash", "online", "transfer"]).default("cash"),
  promoCode: z.string().max(40).nullable().optional(),
  /** Yetkazish hududi (sozlamalardagi ro'yxatdan). */
  deliveryZoneId: z.string().max(60).nullable().optional(),
});

/**
 * 1 KLIKDA (mehmon) — qo'shimcha talablar:
 *   • manzil MAJBURIY (operator mijozni tanimaydi, profil yo'q);
 *   • onlayn (Payme/Click) yo'q — faqat naqd yoki o'tkazma;
 *   • `website` — BOT TUZOG'I (honeypot): odam uni ko'rmaydi va
 *     to'ldirmaydi, oddiy spam-bot esa har maydonni to'ldiradi.
 */
export const quickOrderSchema = orderSchema.extend({
  deliveryAddress: z.string().trim().min(5, "Manzilni to'liqroq yozing").max(500),
  paymentMethod: z.enum(["cash", "transfer"]).default("cash"),
  /**
   * BITTA mahsulot, ko'pi bilan 99 dona (oyna ham shuncha beradi).
   * Ochiq (mehmon) yo'l: ilgari 5 ta mahsulot × 10 000 dona mumkin edi
   * — bitta so'rov bilan 5 ta mahsulotning zaxirasini nolga tushirib,
   * admin har birini qo'lda bekor qilguncha sotuvdan chiqarib qo'yish
   * mumkin edi (tekshiruvchi topgan, D1).
   */
  items: z.array(orderItemSchema.extend({ quantity: z.number().int().positive().max(99) })).length(1),
  website: z.string().max(200).optional(),
});

const CUSTOMER_FIELDS: Record<string, string> = {
  customerName: "Ism",
  phoneNumber: "Telefon raqam",
  deliveryAddress: "Manzil",
  paymentMethod: "To'lov usuli",
  items: "Mahsulotlar",
};

/**
 * MIJOZGA ko'rinadigan xato matni.
 *
 * `lib/http/validation.ts` dagi `validationMessage` ADMIN uchun
 * (maydon yorliqlari "Optom narx", "Tannarx" kabi) — mijozga u
 * ko'rsatilmaydi. Bu yerda faqat mijoz to'ldiradigan maydonlar va
 * sxemadagi o'zbekcha xabar; qolgani — umumiy matn.
 */
export function orderErrorMessage(error: ZodError): string {
  const issue = error.issues.find((item) => CUSTOMER_FIELDS[String(item.path[0])]);
  if (!issue) return "Buyurtma ma'lumotlari noto'g'ri.";
  const label = CUSTOMER_FIELDS[String(issue.path[0])] ?? "";
  // Zod'ning inglizcha standart xabarlari mijozga chiqmaydi.
  const own = /^(Invalid|Expected|Required|String must|Number must|Array must)/.test(issue.message)
    ? "noto'g'ri"
    : issue.message;
  // Xabar allaqachon maydon nomi bilan boshlansa ("Telefon raqam noto'g'ri")
  // yorliq takrorlanmaydi ("Telefon raqam: Telefon raqam noto'g'ri" bo'lmasin).
  const text = own.toLowerCase().startsWith(label.toLowerCase().slice(0, 4)) ? own : `${label}: ${own}`;
  return `${text.replace(/\.$/, "")}.`;
}
