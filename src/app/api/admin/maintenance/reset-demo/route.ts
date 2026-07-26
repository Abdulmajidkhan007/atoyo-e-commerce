import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { requireOwner } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  /** Tasodifiy bosishning oldini olish uchun aniq so'z talab qilinadi. */
  confirm: z.literal("TOZALASH"),
  /** Nimalar tozalanishi - har biri alohida tanlanadi. */
  orders: z.boolean().default(true),
  stats: z.boolean().default(true),
  salesCount: z.boolean().default(true),
  reviews: z.boolean().default(false),
});

/** Kolleksiyani bo'lib-bo'lib o'chiradi (batch chegarasi 500). */
async function deleteCollection(name: string): Promise<number> {
  const db = getAdminDb();
  let deleted = 0;

  for (;;) {
    const snap = await db.collection(name).limit(300).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snap.size;

    if (snap.size < 300) break;
  }
  return deleted;
}

/** Barcha mahsulotlarda salesCount ni nolga tushiradi. */
async function resetSalesCount(): Promise<number> {
  const db = getAdminDb();
  const snap = await db.collection("products").select("salesCount").get();
  let updated = 0;

  for (let i = 0; i < snap.docs.length; i += 300) {
    const chunk = snap.docs.slice(i, i + 300);
    const batch = db.batch();
    chunk.forEach((doc) => batch.update(doc.ref, { salesCount: 0 }));
    await batch.commit();
    updated += chunk.length;
  }
  return updated;
}

/**
 * TEST (mock) MA'LUMOTLARINI TOZALASH - faqat loyiha egasi.
 *
 * Sinov davrida to'plangan buyurtmalar, "Jami buyurtmalar / Jami tushum"
 * ko'rsatkichlari va mahsulotlardagi sotuv hisoblagichlari nolga
 * tushiriladi. Mahsulotlar, foydalanuvchilar, blog, sozlamalar
 * VA BOSHQA HECH NARSA o'chirilmaydi.
 */
export async function POST(request: Request) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "Bu amalni faqat loyiha egasi bajara oladi." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Tasdiqlash so'zi noto'g'ri." }, { status: 400 });
  }

  const result = { orders: 0, reviews: 0, products: 0, stats: false };

  try {
    if (parsed.data.orders) result.orders = await deleteCollection("orders");
    if (parsed.data.reviews) result.reviews = await deleteCollection("reviews");
    if (parsed.data.salesCount) result.products = await resetSalesCount();
    if (parsed.data.stats) {
      await getAdminDb().doc("stats/summary").set({ totalOrders: 0, totalRevenue: 0 }, { merge: true });
      result.stats = true;
    }

    await logAction(
      `🧹 Test ma'lumotlari tozalandi (${owner.email}): ${result.orders} buyurtma, ${result.reviews} sharh, ${result.products} mahsulot hisoblagichi`
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Tozalashda xato:", error);
    return NextResponse.json({ error: "Tozalashda xatolik yuz berdi." }, { status: 500 });
  }
}
