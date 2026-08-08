import { NextResponse } from "next/server";
import { getFacets } from "@/lib/products/facets";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Filtr paneli uchun brend/davlat ro'yxati (ochiq - katalog filtrida ishlatiladi). */
export async function GET() {
  const facets = await getFacets();
  // Brend/davlat ro'yxati hammaga bir xil - CDN 10 daqiqa keshlaydi.
  return NextResponse.json(facets, { headers: publicCacheHeaders(600) });
}
