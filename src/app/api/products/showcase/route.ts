import { NextResponse } from "next/server";
import { loadShowcaseRaw } from "@/lib/products/storefront";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { storefrontRole, toViewerProducts } from "@/lib/products/viewer";
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
      { products: toViewerProducts(products, storefrontRole(viewer?.role), pricing) },
      { headers: NO_STORE_HEADERS }
    );

  try {
    // Tanlash mantiqi `lib/products/storefront.ts` da - bosh sahifaning
    // SERVER renderi ham xuddi shu ro'yxatni oladi (nusxa bo'lmasin).
    return respond(await loadShowcaseRaw());
  } catch (error) {
    console.error("Bosh sahifa namunasini olishda xato:", error);
    // Bosh sahifa baribir ochilishi kerak - bo'sh ro'yxat qaytadi.
    return respond([]);
  }
}
