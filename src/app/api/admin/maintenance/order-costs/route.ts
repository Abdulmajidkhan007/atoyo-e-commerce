import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Bir so'rovda o'qiladigan buyurtmalar soni. */
const PAGE = 400;
/**
 * Bitta batch'ga qo'yiladigan yozuvlar chegarasi. Har migratsiya
 * qilingan buyurtma IKKITA yozuv beradi (`orderCosts` + `orders`
 * yangilanishi), Firestore batch chegarasi esa 500 - shu sababli
 * 400 ta buyurtmadan keyin emas, 400 ta YOZUVdan keyin commit qilinadi.
 */
const BATCH_LIMIT = 400;

interface LegacyOrderItem {
  productId: string;
  variantId?: string | null;
  costPrice?: number | null;
  [key: string]: unknown;
}

/**
 * BIR MARTALIK MIGRATSIYA (faqat loyiha egasi, qo'lda chaqiriladi).
 *
 * Eski buyurtmalarda tannarx `orders/{id}.items[].costPrice` da ochiq
 * saqlangan (CLAUDE.md 1-qoidasi buzilgan holat) - endi yangi
 * buyurtmalar tannarxni to'g'ridan-to'g'ri yopiq `orderCosts/{id}`
 * hujjatiga yozadi (`lib/orders/create-order.ts`). Bu route eski
 * hujjatlarni shu ko'rinishga o'tkazadi: tannarxni `orderCosts` ga
 * ko'chiradi va `orders` dagi `items` massivini undan tozalab qayta
 * yozadi.
 *
 * Firestore'da massiv ICHIDAGI bitta maydonni nuqta yo'li bilan
 * o'chirib bo'lmaydi (`FieldValue.delete()` faqat xarita maydoniga
 * ishlaydi, massiv elementiga emas) - shuning uchun butun `items`
 * massivi tannarxsiz holda qayta yoziladi.
 *
 * Idempotent: `costPrice` maydoni bo'lmagan buyurtma (allaqachon
 * ko'chirilgan yoki yangi yaratilgan) o'tkazib yuboriladi - qayta-qayta
 * chaqirish xavfsiz.
 */
export async function POST() {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Bu amalni faqat loyiha egasi bajara oladi." }, { status: 403 });
  }

  const db = getAdminDb();
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let migrated = 0;
  let batch = db.batch();
  let pending = 0;

  const flush = async () => {
    if (pending === 0) return;
    await batch.commit();
    batch = db.batch();
    pending = 0;
  };

  for (;;) {
    let query = db.collection("orders").orderBy("__name__").limit(PAGE);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;

    for (const doc of page.docs) {
      scanned += 1;
      const items = (doc.data().items ?? []) as LegacyOrderItem[];
      const hasLegacyCost = items.some((item) => "costPrice" in item);
      if (!hasLegacyCost) continue;

      const costItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? null,
        costPrice: item.costPrice ?? null,
      }));
      const cleanedItems = items.map(({ costPrice: _costPrice, ...rest }) => rest);

      batch.set(db.collection("orderCosts").doc(doc.id), {
        items: costItems,
        createdAt: (doc.data().createdAt as number | undefined) ?? Date.now(),
      });
      batch.update(doc.ref, { items: cleanedItems });
      pending += 2;
      migrated += 1;

      if (pending >= BATCH_LIMIT) await flush();
    }

    cursor = page.docs[page.docs.length - 1];
    if (page.size < PAGE) break;
  }

  await flush();

  await logAction(
    `🔧 orderCosts migratsiyasi (${owner.email ?? owner.uid}): ${migrated}/${scanned} buyurtma ko'chirildi`
  );

  return NextResponse.json({ ok: true, scanned, migrated });
}
