import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { clearTvSettingsCache, getTvSettings } from "@/lib/tv/settings";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { productPricesForRole } from "@/lib/products/wholesale";
import { siteUrl } from "@/lib/seo/json-ld";
import type { Product } from "@/types/product";
import type { TvSettings, TvSlide } from "@/types/tv";

/**
 * TELEVIZOR SLAYDLARI.
 *
 * MUHIM: televizor - OMMAVIY ekran, shuning uchun narx har doim DONA
 * (chakana) narx bo'ladi. Bazadagi `price` optom, shuning uchun u
 * `productPricesForRole(..., undefined, ...)` orqali o'tkaziladi -
 * optom narx ekranga hech qachon chiqmaydi.
 *
 * So'rovlar mavjud indekslarga tayanadi (`isActive + createdAt`,
 * `isActive + salesCount`, `isActive + category + createdAt`) - yangi
 * kompozit indeks kerak emas. Chegirmadagilar alohida indekssiz:
 * yangi mahsulotlardan bir qism olinib, xotirada filtrlanadi.
 */

/** Chegirma qidirishda ko'riladigan hujjatlar soni. */
const DISCOUNT_SCAN = 300;

type ProductDoc = Product & { salesCount?: number };

function toSlide(
  product: ProductDoc,
  labels: { category: Map<string, string>; unit: Map<string, string> },
  markupSettings: { retailMarkupPercent: number },
  base: string
): TvSlide {
  const { price, discountPrice } = productPricesForRole(product, undefined, markupSettings);
  const hasDiscount = Boolean(
    discountPrice &&
      discountPrice > 0 &&
      discountPrice < price &&
      (!product.discountUntil || product.discountUntil > Date.now())
  );

  return {
    id: product.id,
    name: product.name,
    image: product.images?.[0] ?? product.thumbnailUrl ?? null,
    price: hasDiscount ? discountPrice! : price,
    oldPrice: hasDiscount ? price : null,
    categoryLabel: labels.category.get(product.category) ?? product.category ?? "",
    brand: product.brand ?? "",
    unitLabel: labels.unit.get(product.unit) ?? product.unit ?? "dona",
    inStock: (product.stock ?? 0) > 0,
    url: `${base}/mahsulot/${product.id}`,
  };
}

/** Ekranga chiqmaydiganlar: chernovik, o'chirilgan, rasmsiz. */
function isShowable(product: ProductDoc, onlyInStock: boolean): boolean {
  if (product.isDraft) return false;
  if (product.isActive === false) return false;
  // Rasmsiz mahsulot katta ekranda bo'sh joy bo'lib qoladi.
  if (!product.images?.length && !product.thumbnailUrl) return false;
  if (onlyInStock && (product.stock ?? 0) <= 0) return false;
  return true;
}

async function fetchBySource(settings: TvSettings): Promise<ProductDoc[]> {
  const db = getAdminDb();
  const products = db.collection("products");
  // Filtrdan keyin yetarli qolishi uchun keragidan ko'proq olamiz.
  const wanted = settings.count * 3;

  if (settings.source === "manual") {
    if (settings.productIds.length === 0) return [];
    const refs = settings.productIds.map((id) => products.doc(id));
    const snaps = await db.getAll(...refs);
    return snaps
      .filter((snap) => snap.exists)
      .map((snap) => ({ id: snap.id, ...snap.data() }) as ProductDoc);
  }

  if (settings.source === "top") {
    const snap = await products
      .where("isActive", "==", true)
      .orderBy("salesCount", "desc")
      .limit(wanted)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ProductDoc);
  }

  if (settings.source === "category" && settings.categories.length > 0) {
    // Har kategoriyadan teng miqdorda - bitta kategoriya ekranni
    // egallab olmasin.
    const perCategory = Math.max(2, Math.ceil(wanted / settings.categories.length));
    const chunks = await Promise.all(
      settings.categories.slice(0, 10).map(async (category) => {
        const snap = await products
          .where("isActive", "==", true)
          .where("category", "==", category)
          .orderBy("createdAt", "desc")
          .limit(perCategory)
          .get();
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ProductDoc);
      })
    );
    // Kategoriyalar navbatma-navbat aralashtiriladi.
    const mixed: ProductDoc[] = [];
    for (let i = 0; i < perCategory; i += 1) {
      for (const chunk of chunks) {
        const item = chunk[i];
        if (item) mixed.push(item);
      }
    }
    return mixed;
  }

  const limit = settings.source === "discount" ? DISCOUNT_SCAN : wanted;
  const snap = await products
    .where("isActive", "==", true)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ProductDoc);

  if (settings.source === "discount") {
    const now = Date.now();
    return list.filter(
      (product) =>
        (product.discountPrice ?? 0) > 0 &&
        product.discountPrice! < product.price &&
        (!product.discountUntil || product.discountUntil > now)
    );
  }
  return list;
}

export async function buildTvSlides(settings: TvSettings): Promise<TvSlide[]> {
  if (!settings.enabled) return [];

  const [taxonomy, pricing, raw] = await Promise.all([
    getTaxonomy(),
    getPricingSettings(),
    fetchBySource(settings).catch((error) => {
      console.error("TV slaydlarini olishda xato:", error);
      return [] as ProductDoc[];
    }),
  ]);

  const labels = {
    category: new Map(taxonomy.categories.map((item) => [item.slug, item.label])),
    unit: new Map(taxonomy.units.map((item) => [item.slug, item.label])),
  };
  const base = siteUrl().replace(/\/$/, "");

  const seen = new Set<string>();
  const slides: TvSlide[] = [];
  for (const product of raw) {
    if (slides.length >= settings.count) break;
    if (seen.has(product.id)) continue;
    if (!isShowable(product, settings.onlyInStock)) continue;
    seen.add(product.id);
    slides.push(toSlide(product, labels, pricing, base));
  }
  return slides;
}

/**
 * Televizor sahifasi so'raydigan tayyor javob (sozlama + slaydlar).
 * 2 daqiqa keshlanadi: bitta televizor sutkasiga yuzlab marta so'rasa
 * ham Firestore'ga bir necha o'nlab so'rov ketadi xolos.
 */
const PAYLOAD_TTL = 2 * 60 * 1000;

let payloadCache: { at: number; value: { settings: TvSettings; slides: TvSlide[] } } | null = null;

export async function getTvPayload(): Promise<{ settings: TvSettings; slides: TvSlide[] }> {
  if (payloadCache && Date.now() - payloadCache.at < PAYLOAD_TTL) return payloadCache.value;

  const settings = await getTvSettings();
  const slides = await buildTvSlides(settings);
  const value = { settings, slides };
  payloadCache = { at: Date.now(), value };
  return value;
}

/** Sozlama saqlanganda - o'zgarish darhol ekranga chiqsin. */
export function clearTvCache(): void {
  payloadCache = null;
  clearTvSettingsCache();
}
