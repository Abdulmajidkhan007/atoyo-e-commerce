import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/**
 * ADMIN QIDIRUVI (kirim sahifasi uchun).
 *
 * Saytdagi ochiq qidiruvdan farqi: bu yerda CHERNOVIKLAR ham topiladi -
 * "Yangi mahsulot ochish" bilan ta'riflangan mahsulot aynan shu qidiruv
 * orqali kirimga qo'shiladi. Shuning uchun so'rov Admin SDK bilan,
 * `isActive` filtrisiz bajariladi.
 *
 *   GET /api/admin/products/search?q=ppr   - nom bo'yicha (prefiks)
 *   GET /api/admin/products/search?id=...  - bitta mahsulot
 */
export async function GET(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  const db = getAdminDb();

  if (id) {
    const snap = await db.collection("products").doc(id).get();
    if (!snap.exists) return NextResponse.json({ products: [] });
    return NextResponse.json({ products: [{ id: snap.id, ...snap.data() } as Product] });
  }

  const term = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  if (term.length < 2) return NextResponse.json({ products: [] });

  const words = Array.from(new Set(term.split(/\s+/).filter((w) => w.length >= 2))).slice(0, 10);
  const tokenTerms = words.length > 0 ? words : [term];

  // Nom boshidan (prefiks) va nomning istalgan so'zi (token) bo'yicha.
  // '\uf8ff' - Firestore'da shu prefiksdagi eng oxirgi qiymat.
  const [byPrefix, byToken, byCode] = await Promise.all([
    db
      .collection("products")
      .orderBy("nameSearchIndex")
      .startAt(term)
      .endAt(`${term}\uf8ff`)
      .limit(10)
      .get()
      .catch(() => null),
    db
      .collection("products")
      // Har bir so'z bo'yicha: "8276 dush" ham, "dush 8276" ham topiladi.
      .where("nameTokens", "array-contains-any", tokenTerms)
      .limit(10)
      .get()
      .catch(() => null),
    // Mahsulot raqami bo'yicha (kirimda "12" deb yozilsa).
    /^\d+$/.test(term)
      ? db.collection("products").where("code", "==", Number(term)).limit(3).get().catch(() => null)
      : Promise.resolve(null),
  ]);

  const seen = new Set<string>();
  const products: Product[] = [];
  for (const snap of [byCode, byPrefix, byToken]) {
    for (const doc of snap?.docs ?? []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      products.push({ id: doc.id, ...doc.data() } as Product);
    }
  }

  return NextResponse.json({ products: products.slice(0, 10) });
}
