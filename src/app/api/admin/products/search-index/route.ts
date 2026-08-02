import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { bulkIndex, isSearchEngineConfigured } from "@/lib/search/engine";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * BUTUN KATALOGNI qidiruv motoriga yuborish (bir martalik yoki
 * vaqti-vaqti bilan). Motor sozlanmagan bo'lsa xato qaytaradi -
 * admin nima yetishmayotganini biladi.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("products", request);
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  if (!isSearchEngineConfigured()) {
    return NextResponse.json(
      {
        error:
          "Qidiruv motori sozlanmagan. TYPESENSE_HOST va TYPESENSE_API_KEY qo'shilishi kerak (docs/DEPLOY.md).",
      },
      { status: 400 }
    );
  }

  const snap = await getAdminDb().collection("products").limit(5000).get();
  const products = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product);

  try {
    const count = await bulkIndex(products);
    return NextResponse.json({ ok: true, indexed: count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indekslashda xato." },
      { status: 500 }
    );
  }
}
