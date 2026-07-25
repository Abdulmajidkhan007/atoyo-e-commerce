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
