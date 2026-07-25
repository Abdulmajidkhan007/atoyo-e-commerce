import { NextResponse } from "next/server";
import { getFacets } from "@/lib/products/facets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Filtr paneli uchun brend/davlat ro'yxati (ochiq - katalog filtrida ishlatiladi). */
export async function GET() {
  const facets = await getFacets();
  return NextResponse.json(facets);
}
