import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSearchEngineConfigured, searchWithEngine } from "@/lib/search/engine";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { storefrontRole, toViewerProducts } from "@/lib/products/viewer";
import { NO_STORE_HEADERS } from "@/lib/http/cache";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TEZKOR QIDIRUV (tashqi motor orqali).
 *
 * Motor sozlangan bo'lsa - natijalar shu yerdan keladi (10 000+
 * mahsulotda ham bir necha millisekund, xato yozilgan so'zni ham
 * topadi). Sozlanmagan bo'lsa `{ engine: false }` qaytadi va sayt/ilova
 * avvalgi Firestore qidiruviga tushadi.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const term = (params.get("q") ?? "").trim();
  const limit = Math.min(Number(params.get("limit") ?? 24), 60);

  if (!isSearchEngineConfigured()) {
    return NextResponse.json({ engine: false, products: [] });
  }
  if (!term) return NextResponse.json({ engine: true, products: [] });

  const result = await searchWithEngine(term, limit);
  if (!result) return NextResponse.json({ engine: false, products: [] });

  // Motor faqat ID beradi - to'liq ma'lumot Firestore'dan olinadi
  // (narx/zaxira har doim yangi bo'lishi uchun).
  const db = getAdminDb();
  const docs = await Promise.all(
    result.ids.slice(0, limit).map((id) => db.collection("products").doc(id).get())
  );
  const products = docs
    .filter((doc) => doc.exists)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
    .filter((product) => product.isActive !== false && !product.isDraft);

  // Narx ko'ruvchining roliga moslanadi, optom narx/tannarx berilmaydi.
  const [viewer, pricing] = await Promise.all([
    getAppUserFromRequest(request).catch(() => null),
    getPricingSettings(),
  ]);

  return NextResponse.json(
    {
      engine: true,
      found: result.found,
      products: toViewerProducts(products, storefrontRole(viewer?.role), pricing),
    },
    { headers: NO_STORE_HEADERS }
  );
}
