import { NextResponse } from "next/server";
import { getPricingSettings } from "@/lib/products/pricing-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Narx sozlamalari (dona ustamasi va eng kam buyurtma summasi).
 * Sayt va ilova ko'rsatiladigan narxni shu foiz bilan hisoblaydi.
 */
export async function GET() {
  const settings = await getPricingSettings();
  return NextResponse.json({ pricing: settings });
}
