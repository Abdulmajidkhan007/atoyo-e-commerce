import { NextResponse } from "next/server";
import { getTaxonomy } from "@/lib/products/taxonomy-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kategoriya / material / sotish turi ro'yxatlari - client formalar va
 * filtrlar uchun (ochiq ma'lumot, maxfiy narsa yo'q).
 */
export async function GET() {
  return NextResponse.json({ taxonomy: await getTaxonomy() });
}
