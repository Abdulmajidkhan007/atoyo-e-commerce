import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProducts } from "@/lib/products/viewer";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { NO_STORE_HEADERS } from "@/lib/http/cache";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * BOSH SAHIFA NAMUNASI: 6 ta mahsulot, HAR KATEGORIYADAN BITTADAN.
 *
 * Katalogda 3 000+ mahsulot bo'lgach bosh sahifada uzun ro'yxat
 * ko'rsatishning ma'nosi yo'q: mijoz nima sotilishini bir qarashda
 * ko'rishi kerak. Shuning uchun kategoriyalar bo'yicha yurib, har
 * biridan bitta (zaxirasi bori ustun, keyin eng yangisi) olinadi.
 *
 * Natija 5 daqiqa keshlanadi - bosh sahifa har ochilganda Firestore'ga
 * o'nlab so'rov ketmasin.
 */

/** Nechta mahsulot ko'rsatiladi (= nechta kategoriya). */
const SHOWCASE_SIZE = 6;
/** Bitta kategoriyadan shuncha nomzod olinadi (zaxirasi borini tanlash uchun). */
const CANDIDATES = 5;
/** Ko'rib chiqiladigan kategoriyalar chegarasi (bo'shlari ham bo'lishi mumkin). */
const MAX_CATEGORIES = 14;
const TTL = 5 * 60 * 1000;

let cache: { at: number; products: Product[] } | null = null;

export async function GET(request: Request) {
  // Kesh XOM mahsulotlarni saqlaydi; javob esa har so'rovda
  // ko'ruvchining roliga moslanadi - optom mijoz optom narxni,
  // qolganlar dona narxni ko'radi. Shuning uchun javob HTTP
  // darajasida keshlanmaydi (CDN cookie bo'yicha ajratmaydi).
  const [viewer, pricing] = await Promise.all([
    getAppUserFromRequest(request).catch(() => null),
    getPricingSettings(),
  ]);
  const respond = (products: Product[]) =>
    NextResponse.json(
      { products: toViewerProducts(products, viewer?.role, pricing) },
      { headers: NO_STORE_HEADERS }
    );

  if (cache && Date.now() - cache.at < TTL) {
    return respond(cache.products);
  }

  try {
    const taxonomy = await getTaxonomy();
    const db = getAdminDb();
    const picked: Product[] = [];

    for (const category of taxonomy.categories.slice(0, MAX_CATEGORIES)) {
      if (picked.length >= SHOWCASE_SIZE) break;

      const snapshot = await db
        .collection("products")
        .where("isActive", "==", true)
        .where("category", "==", category.slug)
        .orderBy("createdAt", "desc")
        .limit(CANDIDATES)
        .get();

      const items = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
        .filter((product) => !product.isDraft);
      if (items.length === 0) continue;

      // Zaxirasi bori oldinda: mijoz darhol sotib ola oladigan mahsulot.
      const best = items.find((product) => (product.stock ?? 0) > 0) ?? items[0]!;
      picked.push(best);
    }

    cache = { at: Date.now(), products: picked };
    return respond(picked);
  } catch (error) {
    console.error("Bosh sahifa namunasini olishda xato:", error);
    // Bosh sahifa baribir ochilishi kerak - bo'sh ro'yxat qaytadi.
    return respond([]);
  }
}
