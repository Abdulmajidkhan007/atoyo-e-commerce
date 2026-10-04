import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { getDeliverySettings } from "@/lib/orders/pricing";
import { getTransferSettings } from "@/lib/payments/transfer";
import { isAnyPaymentConfigured } from "@/lib/payments/config";
import { isTransferUsable } from "@/types/payment-transfer";
import type { FaqItem, FaqSettings } from "@/types/site-pages";
import { defaultFaqItems, normalizeFaqItems } from "./faq";

/**
 * `settings/faq` — 60 soniya kesh (sozlama kam o'zgaradi, sahifa esa
 * har ko'rishda o'qiydi). Admin saqlaganda `clearFaqCache()`.
 */
const DOC_PATH = "settings/faq";
const TTL = 60_000;
let cache: { value: FaqSettings; at: number } | null = null;

export function clearFaqCache(): void {
  cache = null;
}

/** Admin saqlagan ro'yxat (saqlamagan bo'lsa `saved: false`). */
export async function getFaqSettings(): Promise<FaqSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const data = snap.data() as { items?: unknown } | undefined;
    const value: FaqSettings = { items: normalizeFaqItems(data?.items), saved: snap.exists };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return { items: [], saved: false };
  }
}

export async function saveFaqItems(items: FaqItem[]): Promise<FaqItem[]> {
  const clean = normalizeFaqItems(items);
  await getAdminDb().doc(DOC_PATH).set({ items: clean, updatedAt: Date.now() });
  clearFaqCache();
  return clean;
}

/** Sozlamadan yasalgan standart savollar (admin forma va sahifa uchun). */
export async function buildDefaultFaq(): Promise<FaqItem[]> {
  const [delivery, transfer] = await Promise.all([getDeliverySettings(), getTransferSettings()]);
  return defaultFaqItems({
    delivery,
    transferEnabled: isTransferUsable(transfer),
    onlineEnabled: isAnyPaymentConfigured(),
  });
}

/** Saytda chiqadigan ro'yxat: admin saqlagani, aks holda standart. */
export async function getPublicFaq(): Promise<FaqItem[]> {
  const settings = await getFaqSettings();
  return settings.saved ? settings.items : buildDefaultFaq();
}
