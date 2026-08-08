import { NextResponse } from "next/server";
import { getAppUserFromRequest } from "@/lib/firebase/session";
import { queryProductsPage } from "@/lib/products/catalog-server";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import {
  filterPriceToWholesale,
  staffSeesInternal,
  storefrontRole,
  toViewerProducts,
} from "@/lib/products/viewer";
import { NO_STORE_HEADERS } from "@/lib/http/cache";
import type { ProductFilterParams } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * KATALOG SAHIFASI (mijoz uchun).
 *
 * Ilgari brauzer Firestore'dan to'g'ridan-to'g'ri o'qirdi va shu bilan
 * OPTOM narx ham ochiq ketardi. Endi so'rov shu yerdan o'tadi:
 * filtr/saralash baza tomonida qoladi, javobdagi narx esa
 * KO'RUVCHINING ROLIGA moslanadi (`lib/products/viewer.ts`).
 *
 * Javob HECH QACHON keshlanmaydi: bir mijoz optom, boshqasi dona
 * narx ko'radi, CDN esa cookie bo'yicha ajratmaydi.
 */

type SortOption = NonNullable<ProductFilterParams["sortBy"]>;
const SORTS: SortOption[] = ["newest", "price-asc", "price-desc", "popular"];

function numberParam(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const [viewer, pricing] = await Promise.all([
    getAppUserFromRequest(request).catch(() => null),
    getPricingSettings(),
  ]);

  // ADMIN PANEL `raw=1` bilan so'raydi - unga OPTOM narx kerak
  // (u shu qiymatni tahrirlaydi). Vitrinada esa xodim ham mijoz
  // ko'rgan narxni ko'radi.
  const wantsRaw = params.get("raw") === "1" && staffSeesInternal(viewer?.role);
  const role = wantsRaw ? viewer?.role : storefrontRole(viewer?.role);

  const sortParam = params.get("sortBy") as SortOption | null;
  const rawMin = numberParam(params.get("minPrice"));
  const rawMax = numberParam(params.get("maxPrice"));

  const filters: ProductFilterParams = {
    category: params.get("category") ?? undefined,
    brand: params.get("brand") ?? undefined,
    material: params.get("material") ?? undefined,
    manufacturerCountry: params.get("manufacturerCountry") ?? undefined,
    inStockOnly: params.get("inStockOnly") === "1",
    // Mijoz KO'RSATILGAN narxda o'ylaydi, bazada esa optom narx turadi.
    minPrice: rawMin === undefined ? undefined : filterPriceToWholesale(rawMin, role, pricing),
    maxPrice: rawMax === undefined ? undefined : filterPriceToWholesale(rawMax, role, pricing),
    sortBy: sortParam && SORTS.includes(sortParam) ? sortParam : "newest",
  };

  const pageSize = Math.min(Math.max(numberParam(params.get("pageSize")) ?? 24, 1), 60);

  try {
    const page = await queryProductsPage(filters, pageSize, params.get("cursor"));
    return NextResponse.json(
      {
        products: toViewerProducts(page.products, role, pricing),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Katalogni o'qishda xato:", error);
    return NextResponse.json(
      { error: "Katalog o'qilmadi.", products: [], nextCursor: null, hasMore: false },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
