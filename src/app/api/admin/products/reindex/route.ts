import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireAdminUser } from "@/lib/firebase/session";
import { buildNameTokens } from "@/lib/search/tokens";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

/**
 * Bir martalik qidiruv indeksini to'ldirish: nameTokens maydoni bo'lmagan
 * eski mahsulotlarga token yozadi (yangi so'z-qidiruv ular uchun ham
 * ishlashi uchun). Idempotent - qayta bosilsa faqat yetishmayotganlarni
 * to'ldiradi. Faqat admin.
 */
export async function POST() {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const snapshot = await getAdminDb().collection("products").limit(500).get();
  const batch = getAdminDb().batch();
  let updated = 0;

  for (const doc of snapshot.docs) {
    const p = doc.data() as Product;
    if (Array.isArray(p.nameTokens) && p.nameTokens.length > 0) continue;
    batch.update(doc.ref, { nameTokens: buildNameTokens(p.name, p.brand) });
    updated += 1;
  }

  if (updated > 0) await batch.commit();
  return NextResponse.json({ ok: true, scanned: snapshot.size, updated });
}
