import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_PRICING_SETTINGS, type PricingSettings } from "./wholesale";

/**
 * NARX SOZLAMALARI (`settings/pricing`): dona ustamasi va buyurtmaning
 * eng kam summasi. Bir necha joyda kerak bo'lgani uchun 60 soniya
 * keshlanadi - har buyurtmada Firestore'ga bormaydi.
 */
let cache: { value: PricingSettings; at: number } | null = null;
const TTL = 60_000;

export async function getPricingSettings(): Promise<PricingSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;

  try {
    const snap = await getAdminDb().collection("settings").doc("pricing").get();
    const data = snap.data() as Partial<PricingSettings> | undefined;
    const value: PricingSettings = {
      retailMarkupPercent:
        typeof data?.retailMarkupPercent === "number" && data.retailMarkupPercent >= 0
          ? data.retailMarkupPercent
          : DEFAULT_PRICING_SETTINGS.retailMarkupPercent,
      minOrderAmount:
        typeof data?.minOrderAmount === "number" && data.minOrderAmount >= 0
          ? data.minOrderAmount
          : DEFAULT_PRICING_SETTINGS.minOrderAmount,
    };
    cache = { value, at: Date.now() };
    return value;
  } catch {
    // Sozlama o'qilmasa standart qiymat bilan ishlayveramiz.
    return DEFAULT_PRICING_SETTINGS;
  }
}

/** Sozlama saqlangandan keyin kesh bekor qilinadi. */
export function clearPricingCache(): void {
  cache = null;
}
