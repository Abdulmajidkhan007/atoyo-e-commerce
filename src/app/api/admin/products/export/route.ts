import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { productsToCsv } from "@/lib/products/csv";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Butun katalogni CSV fayl sifatida yuklab olish (Excel'da ochiladi). */
export async function GET() {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const snap = await getAdminDb().collection("products").get();
  const products = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Product);
  const csv = productsToCsv(products);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atoyo-katalog-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
