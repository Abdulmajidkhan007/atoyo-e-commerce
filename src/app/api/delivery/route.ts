import { NextResponse } from "next/server";
import { getDeliverySettingsCached } from "@/lib/orders/pricing";
import { NO_STORE_HEADERS } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Yetkazib berish narxi - checkout va savatda ko'rsatish uchun.
 * CDN'da KESHLANMAYDI (`no-store`): pul summasi bo'lgani uchun har
 * sahifa bir xil va yangi qiymatni ko'rishi shart (ARXITEKTURA-TARIXI
 * 37). Bazaga yuk server xotirasidagi 30 s kesh bilan kamaytirilgan.
 */
export async function GET() {
  return NextResponse.json({ delivery: await getDeliverySettingsCached() }, { headers: NO_STORE_HEADERS });
}
