import { NextResponse } from "next/server";
import { getPricingSettings } from "@/lib/products/pricing-settings";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MIJOZGA OCHIQ NARX SOZLAMASI — faqat buyurtmaning eng kam summasi.
 *
 * USTAMA FOIZI (`retailMarkupPercent`) ATAYLAB BERILMAYDI. Mahsulot
 * narxi endi serverda rolga qarab hisoblanadi
 * (`lib/products/viewer.ts`), mijozga esa tayyor narx boradi. Agar
 * ustama foizi ochiq bo'lsa, dona narxdan OPTOM narxni teskari
 * hisoblab olish mumkin bo'lardi:
 *
 *     optom = dona / (1 + ustama / 100)
 *
 * ya'ni narxni yashirishning ma'nosi qolmasdi.
 */
export async function GET() {
  const settings = await getPricingSettings();
  // Eng kam buyurtma summasi hammaga bir xil - keshlash xavfsiz.
  return NextResponse.json(
    { pricing: { minOrderAmount: settings.minOrderAmount } },
    { headers: publicCacheHeaders(300) }
  );
}
