import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { toViewerProducts } from "@/lib/products/viewer";
import { NO_STORE_HEADERS } from "@/lib/http/cache";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bir so'rovda nechta mahsulot olinishi mumkin. */
const MAX_IDS = 30;

/**
 * ID lar bo'yicha mahsulotlar (sevimlilar va savatni yangilash uchun).
 *
 * Sevimlilar ro'yxati qurilmada saqlanadi, narx esa o'zgargan
 * bo'lishi mumkin - shu route yangi narxni rolga mos holda qaytaradi.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json({ products: [] }, { headers: NO_STORE_HEADERS });
  }

  const [viewer, pricing] = await Promise.all([
    getAppUserFromRequest(request).catch(() => null),
    getPricingSettings(),
  ]);

  try {
    const db = getAdminDb();
    const snapshots = await db.getAll(...ids.map((id) => db.collection("products").doc(id)));
    const products = snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }) as Product)
      .filter((product) => product.isActive !== false);

    return NextResponse.json(
      { products: toViewerProducts(products, viewer?.role, pricing) },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Mahsulotlarni ID bo'yicha o'qishda xato:", error);
    return NextResponse.json(
      { error: "O'qilmadi.", products: [] },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
