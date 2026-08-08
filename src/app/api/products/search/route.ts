import { NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { searchProductsServer } from "@/lib/products/catalog-server";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProducts } from "@/lib/products/viewer";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * QIDIRUVNING BIRINCHI BOSQICHI (baza tomoni).
 *
 * Natijalar keyin mijoz tomonda `lib/search/fuzzy.ts` bilan
 * xatoga chidamli tarzda qayta saralanadi - shuning uchun bu yerda
 * kengroq "deraza" (bir necha o'nlab natija) qaytariladi.
 *
 * Narx ko'ruvchining roliga moslanadi, javob keshlanmaydi.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const term = (params.get("q") ?? "").slice(0, 120);
  if (!term.trim()) {
    return NextResponse.json({ products: [] }, { headers: NO_STORE_HEADERS });
  }

  const size = Number(params.get("pageSize"));
  const pageSize = Number.isFinite(size) ? Math.min(Math.max(size, 1), 120) : 24;

  const [viewer, pricing] = await Promise.all([
    getAppUserFromRequest(request).catch(() => null),
    getPricingSettings(),
  ]);

  try {
    const products = await searchProductsServer(term, pageSize);
    return NextResponse.json(
      { products: toViewerProducts(products, viewer?.role, pricing) },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Qidiruvda xato:", error);
    return NextResponse.json(
      { error: "Qidiruv ishlamadi.", products: [] },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
