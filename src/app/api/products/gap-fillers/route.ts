import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { filterPriceToWholesale, storefrontRole, toViewerProducts } from "@/lib/products/viewer";
import { effectivePrice } from "@/lib/products/pricing";
import { rankGapFillers } from "@/lib/products/gap-fillers";
import { NO_STORE_HEADERS } from "@/lib/http/cache";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bazadan nechta nomzod o'qiladi (tartiblash xotirada). */
const POOL = 60;
const MAX_EXCLUDE = 50;
const MAX_CATEGORIES = 10;

/**
 * BEPUL YETKAZISHGACHA FARQNI YOPADIGAN MAHSULOTLAR.
 *
 * `?gap=46000&exclude=id1,id2&categories=xostovar` — `gap` mijoz
 * KO'RADIGAN narxda (dona/optom). Bazada narx optom, shuning uchun
 * so'rov chegarasi optomga o'giriladi va biroz PASTROQ olinadi:
 * alohida ustamasi baland mahsulot ham nomzodga tushsin. Aniq
 * solishtirish `toViewerProducts()` dan KEYIN, ko'rinadigan narxda.
 *
 * NARX MAXFIYLIGI: javob `toViewerProducts()` dan o'tadi va
 * keshlanmaydi (`no-store`) — narx rolga bog'liq.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const gap = Math.round(Number(params.get("gap")));
  if (!Number.isFinite(gap) || gap <= 0 || gap > 100_000_000) {
    return NextResponse.json({ products: [] }, { headers: NO_STORE_HEADERS });
  }
  const list = (name: string, max: number) =>
    (params.get(name) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, max);
  const exclude = list("exclude", MAX_EXCLUDE);
  const cartCategories = list("categories", MAX_CATEGORIES);

  try {
    const [viewer, pricing] = await Promise.all([
      getAppUserFromRequest(request).catch(() => null),
      getPricingSettings(),
    ]);
    const role = storefrontRole(viewer?.role);
    const minWholesale = Math.floor(filterPriceToWholesale(gap, role, pricing) * 0.8);

    const snapshot = await getAdminDb()
      .collection("products")
      .where("isActive", "==", true)
      .where("price", ">=", minWholesale)
      .orderBy("price", "asc")
      .limit(POOL)
      .get();

    const raw = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
      .filter((product) => !product.isDraft);
    const shown = toViewerProducts(raw, role, pricing);
    const byId = new Map(shown.map((product) => [product.id, product]));

    const ranked = rankGapFillers(
      shown.map((product) => ({
        id: product.id,
        category: product.category,
        shownPrice: effectivePrice(product),
        stock: product.stock ?? 0,
        hasImage: (product.images ?? []).length > 0 || Boolean(product.thumbnailUrl),
      })),
      { gap, cartCategories, exclude }
    );

    return NextResponse.json(
      { products: ranked.map((item) => byId.get(item.id)).filter(Boolean) },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Farqni yopadigan mahsulotlarni o'qishda xato:", error);
    // Bu yordamchi blok - xato bo'lsa savat baribir ishlaydi.
    return NextResponse.json({ products: [] }, { headers: NO_STORE_HEADERS });
  }
}
