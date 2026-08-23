import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { bulkIndex, isSearchEngineConfigured } from "@/lib/search/engine";
import type { Product } from "@/types/product";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Bir sahifada o'qiladigan hujjatlar soni (reindex/route.ts dagi naqsh). */
const PAGE = 500;
/** Xotira uchun yuqori chegara (10 000+ katalog uchun yetarli). */
const MAX_DOCS = 20_000;

/**
 * BUTUN KATALOGNI qidiruv motoriga yuborish (bir martalik yoki
 * vaqti-vaqti bilan). Motor sozlanmagan bo'lsa xato qaytaradi -
 * admin nima yetishmayotganini biladi. Kursor (`__name__`) bilan
 * sahifama-sahifa o'qiladi va indekslanadi - ilgari `limit(5000)`
 * turardi va 5000 tadan ko'p mahsulot bo'lsa qolgani JIMGINA
 * indekslanmay qolardi.
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

  const db = getAdminDb();
  let indexed = 0;
  let scanned = 0;
  let truncated = false;
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  try {
    for (;;) {
      let query = db.collection("products").orderBy("__name__").limit(PAGE);
      if (cursor) query = query.startAfter(cursor);
      const page = await query.get();
      if (page.empty) break;

      const products = page.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Product);
      indexed += await bulkIndex(products);
      scanned += page.docs.length;
      cursor = page.docs[page.docs.length - 1];

      if (page.size < PAGE) break;
      if (scanned >= MAX_DOCS) {
        truncated = true;
        break;
      }
    }

    return NextResponse.json({ ok: true, indexed, scanned, truncated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Indekslashda xato.", indexed, scanned },
      { status: 500 }
    );
  }
}
