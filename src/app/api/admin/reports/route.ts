import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import type { Order } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DO'KON EGASI UCHUN HISOBOT.
 *
 * Tanlangan davr bo'yicha: tushum, foyda (sotuv narxi - tannarx),
 * buyurtmalar soni, o'rtacha chek, kunlik qator va eng ko'p daromad
 * keltirgan mahsulotlar.
 *
 * BEKOR QILINGAN buyurtmalar hisobga olinmaydi. Foyda faqat tannarxi
 * yozilgan qatorlardan hisoblanadi - shuning uchun javobda "tannarxi
 * yo'q qatorlar ulushi" ham qaytariladi (ishonchlilik ko'rsatkichi).
 */

interface DayRow {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

interface ProductRow {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
  profit: number;
}

export async function GET(request: Request) {
  const admin = await requirePermission("analytics", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const days = Math.min(Math.max(Number(params.get("days") ?? 30), 1), 365);
  const from = params.get("from")
    ? new Date(`${params.get("from")}T00:00:00`).getTime()
    : Date.now() - days * 24 * 60 * 60 * 1000;
  const to = params.get("to") ? new Date(`${params.get("to")}T23:59:59`).getTime() : Date.now();

  const snap = await getAdminDb()
    .collection("orders")
    .where("createdAt", ">=", from)
    .where("createdAt", "<=", to)
    .orderBy("createdAt", "desc")
    .limit(2000)
    .get();

  const byDay = new Map<string, DayRow>();
  const byProduct = new Map<string, ProductRow>();

  let revenue = 0;
  let profit = 0;
  let orders = 0;
  let itemsWithCost = 0;
  let itemsTotal = 0;

  for (const doc of snap.docs) {
    const order = doc.data() as Order;
    if (order.status === "cancelled") continue;

    orders += 1;
    revenue += order.totalAmount;

    const date = new Date(order.createdAt).toISOString().slice(0, 10);
    const day = byDay.get(date) ?? { date, revenue: 0, profit: 0, orders: 0 };
    day.revenue += order.totalAmount;
    day.orders += 1;

    for (const item of order.items) {
      itemsTotal += 1;
      const lineRevenue = item.price * item.quantity;
      // Tannarx bo'lmasa foyda 0 deb hisoblanadi (ortiqcha ko'rsatmaslik uchun).
      const cost = item.costPrice ?? null;
      const lineProfit = cost !== null ? (item.price - cost) * item.quantity : 0;
      if (cost !== null) itemsWithCost += 1;

      profit += lineProfit;
      day.profit += lineProfit;

      const row = byProduct.get(item.productId) ?? {
        productId: item.productId,
        name: item.name,
        qty: 0,
        revenue: 0,
        profit: 0,
      };
      row.qty += item.quantity;
      row.revenue += lineRevenue;
      row.profit += lineProfit;
      byProduct.set(item.productId, row);
    }

    byDay.set(date, day);
  }

  const daily = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 20);

  return NextResponse.json({
    from,
    to,
    totals: {
      revenue,
      profit,
      orders,
      averageCheck: orders > 0 ? Math.round(revenue / orders) : 0,
      /** Tannarxi yozilgan qatorlar ulushi (%) - foydaning ishonchliligi. */
      costCoverage: itemsTotal > 0 ? Math.round((itemsWithCost / itemsTotal) * 100) : 0,
    },
    daily,
    topProducts,
  });
}
