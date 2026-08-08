import { NextResponse } from "next/server";
import { getDeliverySettings } from "@/lib/orders/pricing";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Yetkazib berish narxi - checkout'da ko'rsatish uchun (ochiq o'qish). */
export async function GET() {
  return NextResponse.json(
    { delivery: await getDeliverySettings() },
    { headers: publicCacheHeaders(300) }
  );
}
