import { NextResponse } from "next/server";
import { getDeliverySettings } from "@/lib/orders/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Yetkazib berish narxi - checkout'da ko'rsatish uchun (ochiq o'qish). */
export async function GET() {
  return NextResponse.json({ delivery: await getDeliverySettings() });
}
