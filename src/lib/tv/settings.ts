import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_TV_SETTINGS, type TvSettings, type TvSource } from "@/types/tv";

/**
 * TELEVIZOR SOZLAMALARI (`settings/tv`). 60 soniya keshlanadi -
 * televizor sahifasi har necha daqiqada qayta so'raydi, har safar
 * Firestore'ga bormasin. Sozlama saqlanganda kesh darhol bekor bo'ladi,
 * shuning uchun o'zgarish bir daqiqada ekranga chiqadi.
 */
const DOC_PATH = "settings/tv";
const TTL = 60 * 1000;

const SOURCES: TvSource[] = ["new", "top", "discount", "category", "manual"];

let cache: { value: TvSettings; at: number } | null = null;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

function stringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);
}

export function normalizeTvSettings(data: Partial<TvSettings> | undefined): TvSettings {
  const source = SOURCES.includes(data?.source as TvSource)
    ? (data!.source as TvSource)
    : DEFAULT_TV_SETTINGS.source;

  return {
    enabled: data?.enabled !== false,
    source,
    categories: stringList(data?.categories, 20),
    productIds: stringList(data?.productIds, 40),
    count: clampNumber(data?.count, 5, 40, DEFAULT_TV_SETTINGS.count),
    slideSeconds: clampNumber(data?.slideSeconds, 4, 60, DEFAULT_TV_SETTINGS.slideSeconds),
    onlyInStock: data?.onlyInStock !== false,
    showPrice: data?.showPrice !== false,
    showQr: data?.showQr !== false,
    headline:
      typeof data?.headline === "string" && data.headline.trim()
        ? data.headline.trim().slice(0, 120)
        : DEFAULT_TV_SETTINGS.headline,
    ticker: typeof data?.ticker === "string" ? data.ticker.slice(0, 300) : DEFAULT_TV_SETTINGS.ticker,
    phone: typeof data?.phone === "string" ? data.phone.slice(0, 40) : DEFAULT_TV_SETTINGS.phone,
  };
}

export async function getTvSettings(): Promise<TvSettings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;

  try {
    const snap = await getAdminDb().doc(DOC_PATH).get();
    const value = normalizeTvSettings(snap.data() as Partial<TvSettings> | undefined);
    cache = { value, at: Date.now() };
    return value;
  } catch {
    // Televizor baribir yonib turishi kerak - standart sozlama bilan.
    return DEFAULT_TV_SETTINGS;
  }
}

export async function saveTvSettings(patch: Partial<TvSettings>): Promise<TvSettings> {
  const next = normalizeTvSettings({ ...(await getTvSettings()), ...patch });
  await getAdminDb().doc(DOC_PATH).set({ ...next, updatedAt: Date.now() }, { merge: true });
  cache = null;
  return next;
}

/** Slayd keshini ham bekor qilish uchun (sozlama saqlanganda). */
export function clearTvSettingsCache(): void {
  cache = null;
}
