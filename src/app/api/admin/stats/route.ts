import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/firebase/session";
import { getDashboardStats, getTopSellingProducts } from "@/lib/firebase/admin-analytics";

export const runtime = "nodejs";

/**
 * DASHBOARD RAQAMLARI (mobil ilova uchun).
 *
 * Saytda bu ma'lumot server komponentida to'g'ridan-to'g'ri o'qiladi;
 * ilovaga esa route kerak. Huquq "analytics" - owner har doim o'tadi.
 */
export async function GET(request: Request) {
  const admin = await requirePermission("analytics", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const [stats, topProducts] = await Promise.all([
    getDashboardStats(),
    getTopSellingProducts(5),
  ]);

  return NextResponse.json({
    stats,
    topProducts: topProducts.map((product) => ({
      id: product.id,
      name: product.name,
      code: product.code ?? null,
      salesCount: product.salesCount ?? 0,
      price: product.price,
    })),
  });
}
