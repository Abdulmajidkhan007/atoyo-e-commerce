import { NextResponse } from "next/server";
import { loadChipCategories } from "@/lib/products/storefront";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KATEGORIYA CHIPLARI (ilova uchun) — faqat mahsuloti bor kategoriyalar.
 *
 * Javobda NARX ham, mahsulot ham YO'Q: faqat `{slug, label}`. Hammaga
 * bir xil, shuning uchun CDN keshi xavfsiz (5 daqiqa — server keshi
 * bilan bir xil).
 */
export async function GET() {
  const categories = await loadChipCategories();
  return NextResponse.json(
    { categories: categories.map(({ slug, label }) => ({ slug, label })) },
    { headers: publicCacheHeaders(300) }
  );
}
