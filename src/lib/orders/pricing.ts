import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { normalizePromoCode } from "@/lib/orders/promo";
import { DEFAULT_DELIVERY_SETTINGS, type DeliverySettings, type PromoCode } from "@/types/promo";

export async function getPromoCode(code: string): Promise<PromoCode | null> {
  const snap = await getAdminDb().doc(`promoCodes/${normalizePromoCode(code)}`).get();
  return snap.exists ? ({ ...snap.data(), code: snap.id } as PromoCode) : null;
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  try {
    const snap = await getAdminDb().doc("settings/delivery").get();
    if (!snap.exists) return DEFAULT_DELIVERY_SETTINGS;
    return { ...DEFAULT_DELIVERY_SETTINGS, ...(snap.data() as Partial<DeliverySettings>) };
  } catch {
    return DEFAULT_DELIVERY_SETTINGS;
  }
}

/**
 * MIJOZGA KO'RSATISH UCHUN (`/api/delivery`) — server xotirasida 30 s.
 *
 * Ilgari javob CDN'da keshlanardi (300 s + stale-while-revalidate
 * 1200 s) va har sahifa turli vaqtdagi ESKI nusxani olardi: admin
 * hudud narxini o'zgartirgach checkout "Qo'qon — 50 000" ko'rsatib,
 * jami 130 900 derdi, server esa buyurtmani 15 000 bilan (95 900)
 * yozardi. Endi javob `no-store`, kesh faqat shu yerda va admin
 * saqlaganda `clearDeliveryCache()` bilan bekor qilinadi.
 * Buyurtma hisobi baribir keshsiz `getDeliverySettings()` dan.
 */
let deliveryCache: { value: DeliverySettings; at: number } | null = null;

export function clearDeliveryCache(): void {
  deliveryCache = null;
}

export async function getDeliverySettingsCached(): Promise<DeliverySettings> {
  if (deliveryCache && Date.now() - deliveryCache.at < 30_000) return deliveryCache.value;
  const value = await getDeliverySettings();
  deliveryCache = { value, at: Date.now() };
  return value;
}
