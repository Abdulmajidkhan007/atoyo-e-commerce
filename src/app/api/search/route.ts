import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { isSearchEngineConfigured, searchWithEngine } from "@/lib/search/engine";
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

  return NextResponse.json({ engine: true, found: result.found, products });
}
