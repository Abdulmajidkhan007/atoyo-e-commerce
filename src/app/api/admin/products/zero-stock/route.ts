import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ZAXIRASI YO'Q MAHSULOTLAR (kirim sahifasidagi ro'yxat uchun).
 *
 * Excel bilan minglab mahsulot yaratilganda ularning zaxirasi 0 bo'ladi.
 * Har birini qidirib o'tirmaslik uchun shu ro'yxat beriladi: admin
 * sonlarni yozib chiqadi va bitta kirim qilib saqlaydi.
 *
 * Faqat `stock == 0` tengligi ishlatiladi (kompozit indeks kerak emas),
 * tartib - hujjat ID si bo'yicha, `after` bilan sahifalanadi. Javob
 * yengil bo'lishi uchun faqat kerakli maydonlar olinadi.
 */
const PAGE_SIZE = 300;

export async function GET(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const limit = Math.min(Number(url.searchParams.get("limit")) || PAGE_SIZE, 500);

  const db = getAdminDb();
  let query = db
    .collection("products")
    .where("stock", "==", 0)
    .select("name", "code", "sku", "unit", "price", "category", "brand", "isDraft", "variantAxes", "variants")
    .orderBy("__name__")
    .limit(limit);

  if (after) query = query.startAfter(db.collection("products").doc(after));

  const snapshot = await query.get();
  const products = snapshot.docs.map((doc) => {
    const data = doc.data() as Partial<Product>;
    return {
      id: doc.id,
      name: data.name ?? "",
      code: data.code ?? null,
      sku: data.sku ?? "",
      unit: data.unit ?? "dona",
      price: data.price ?? 0,
      category: data.category ?? "",
      brand: data.brand ?? "",
      isDraft: data.isDraft === true,
      // Turlari bor mahsulotda kirim aynan bir turga tushadi.
      variants: (data.variants ?? []).map((variant) => ({
        id: variant.id,
        label: (data.variantAxes ?? [])
          .map((axis) => variant.options?.[axis.key])
          .filter(Boolean)
          .join(" • "),
      })),
    };
  });

  return NextResponse.json({
    products,
    // Keyingi sahifa uchun kursor (oxirgi hujjat ID si).
    nextCursor: snapshot.docs.length === limit ? (snapshot.docs.at(-1)?.id ?? null) : null,
  });
}
