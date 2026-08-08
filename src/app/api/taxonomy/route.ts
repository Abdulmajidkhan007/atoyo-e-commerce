import { NextResponse } from "next/server";
import { getTaxonomy } from "@/lib/products/taxonomy-server";
import { publicCacheHeaders } from "@/lib/http/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kategoriya / material / sotish turi ro'yxatlari - client formalar va
 * filtrlar uchun (ochiq ma'lumot, maxfiy narsa yo'q).
 */
export async function GET() {
  // Kategoriya/material ro'yxati - ochiq va kam o'zgaradi.
  return NextResponse.json(
    { taxonomy: await getTaxonomy() },
    { headers: publicCacheHeaders(600) }
  );
}
