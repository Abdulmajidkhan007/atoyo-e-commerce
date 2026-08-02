import type { DeliverySettings, PromoCode } from "@/types/promo";

/** Promokodni tekshirishda chiqadigan xatolar (mijozga ko'rsatiladi). */
export type PromoError = "not-found" | "inactive" | "expired" | "used-up" | "min-amount";

export const PROMO_ERROR_MESSAGES: Record<PromoError, string> = {
  "not-found": "Bunday promokod topilmadi.",
  inactive: "Promokod faol emas.",
  expired: "Promokod muddati tugagan.",
  "used-up": "Promokod ishlatilib bo'lingan.",
  "min-amount": "Buyurtma summasi promokod uchun yetarli emas.",
};

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Promokod chegirmasi (summadan oshib ketmaydi). */
export function promoDiscount(promo: PromoCode, subtotal: number): number {
  const raw = promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(raw, subtotal));
}

/** Promokod shu summaga qo'llanadimi - qo'llansa chegirma miqdorini qaytaradi. */
export function validatePromo(
  promo: PromoCode | null,
  subtotal: number,
  now = Date.now()
): { ok: true; discount: number } | { ok: false; error: PromoError } {
  if (!promo) return { ok: false, error: "not-found" };
  if (!promo.isActive) return { ok: false, error: "inactive" };
  if (promo.expiresAt && promo.expiresAt < now) return { ok: false, error: "expired" };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return { ok: false, error: "used-up" };
  if (subtotal < promo.minOrderAmount) return { ok: false, error: "min-amount" };
  return { ok: true, discount: promoDiscount(promo, subtotal) };
}

/**
 * Yetkazib berish narxi. Chegirmadan KEYINGI summa hisobga olinadi -
 * "50 000 so'mdan yuqori bepul" sharti mijoz to'laydigan summaga bog'liq.
 */
export function deliveryFeeFor(
  settings: DeliverySettings,
  payableAmount: number,
  /** Mijoz tanlagan hudud (bo'lmasa - standart narx). */
  zoneId?: string | null
): number {
  if (!settings.enabled) return 0;

  const zone = zoneId ? (settings.zones ?? []).find((item) => item.id === zoneId) : undefined;
  const fee = zone ? zone.fee : settings.fee;
  const freeFrom = zone?.freeFrom && zone.freeFrom > 0 ? zone.freeFrom : settings.freeFrom;

  if (fee <= 0) return 0;
  if (freeFrom > 0 && payableAmount >= freeFrom) return 0;
  return fee;
}
