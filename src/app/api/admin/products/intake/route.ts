import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { requirePermission } from "@/lib/firebase/session";
import { logAction } from "@/lib/telegram/action-log";
import { registerFacets } from "@/lib/products/facets";
import { getRecentIntakes } from "@/lib/products/intake-history";
import { announceProduct, announceModeFor } from "@/lib/telegram/channel";
import { minVariantPrice } from "@/lib/products/variants";
import type { StockIntake } from "@/types/intake";
import type { Product } from "@/types/product";

export const runtime = "nodejs";

const intakeSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        /** Turlari bo'lgan mahsulotda - qaysi turga kirim bo'layotgani. */
        variantId: z.string().max(300).optional(),
        qty: z.number().int().positive().max(100000),
        /** Ixtiyoriy: kirim bilan birga yangi sotuv narxi. */
        price: z.number().positive().optional(),
        /** Ixtiyoriy: mahsulot kimdan kelgani (yetkazib beruvchi). */
        supplier: z.string().max(120).optional(),
      })
    )
    .min(1)
    .max(100),
});

/** Oxirgi kirimlar - kirim sahifasidagi "so'nggi kirimlar" ro'yxati uchun. */
export async function GET() {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  return NextResponse.json({ intakes: await getRecentIntakes(10) });
}

/**
 * KIRIMDAN KEYINGI E'LON.
 *
 * • chernovik edi  -> endi katalogda: "🆕 Yangi mahsulot!";
 * • zaxirasi 0 edi -> qayta keldi: "♻️ Mahsulot yangilandi";
 * • narx o'zgardi  -> "♻️ Mahsulot yangilandi";
 * • qolgan hollarda kanaldagi post jimgina yangilanadi (yangi son bilan).
 */
async function announceIntake(
  refs: FirebaseFirestore.DocumentReference[],
  before: FirebaseFirestore.DocumentSnapshot[]
): Promise<void> {
  const fresh = await getAdminDb().getAll(...refs);
  await Promise.allSettled(
    fresh.map(async (snap, i) => {
      if (!snap.exists) return;
      const after = { id: snap.id, ...snap.data() } as Product;
      const old = before[i]?.data() as Product | undefined;
      const mode = old?.isDraft ? "new" : announceModeFor(old ?? after, after);
      await announceProduct(after, mode);
    })
  );
}

/**
 * MAHSULOT KIRIMI: mavjud mahsulotlarga yangi partiya keldi - zaxira
 * ko'paytiriladi (atomik increment), xohlasa narx va yetkazib beruvchi
 * ham yangilanadi. Bir so'rovda butun kirim ro'yxati qabul qilinadi.
 */
export async function POST(request: Request) {
  const admin = await requirePermission("products");
  if (!admin) return NextResponse.json({ error: "Ruxsat etilmagan." }, { status: 403 });

  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumotlar noto'g'ri." }, { status: 400 });

  const db = getAdminDb();
  const batch = db.batch();
  const now = Date.now();

  const refs = parsed.data.items.map((item) => db.collection("products").doc(item.productId));
  // Kirim tarixida mahsulot nomi ham saqlanadi - keyinchalik mahsulot
  // o'chirilsa ham hujjat o'qilishi mumkin bo'lsin.
  const snaps = await db.getAll(...refs);

  for (let i = 0; i < parsed.data.items.length; i += 1) {
    const item = parsed.data.items[i]!;
    const updates: Record<string, unknown> = {
      stock: FieldValue.increment(item.qty),
      updatedAt: now,
    };
    // Chernovik ("Yangi mahsulot ochish" bilan ta'riflangan) mahsulotga
    // zaxira kelishi - uning nashr qilinishi: katalogga chiqadi va
    // kanalga "🆕 Yangi mahsulot!" bo'lib e'lon qilinadi.
    if ((snaps[i]?.data() as { isDraft?: boolean } | undefined)?.isDraft) {
      updates.isDraft = false;
      updates.isActive = true;
    }
    // Turlari (o'lcham/rang) bo'lgan mahsulotda kirim aynan bitta turga
    // tushadi: o'sha turning zaxirasi ko'payadi, umumiy `stock` esa
    // yig'indi bo'lib qolaveradi.
    const existing = snaps[i]?.data() as Product | undefined;
    if (existing && (existing.variants?.length ?? 0) > 0) {
      const variants = [...(existing.variants ?? [])];
      const index = variants.findIndex((v) => v.id === item.variantId);
      if (index < 0) {
        return NextResponse.json(
          { error: `"${existing.name}" uchun turini tanlang.` },
          { status: 400 }
        );
      }
      const variant = variants[index]!;
      variants[index] = {
        ...variant,
        stock: variant.stock + item.qty,
        ...(item.price !== undefined ? { price: item.price } : {}),
      };
      updates.variants = variants;
      // Katalogdagi narx - eng arzon tur (filtr va saralash shu bo'yicha).
      updates.price = minVariantPrice({ variants }) ?? existing.price;
    } else if (item.price !== undefined) {
      updates.price = item.price;
    }
    if (item.supplier !== undefined && item.supplier.trim()) {
      updates.supplier = item.supplier.trim();
      // Yetkazib beruvchi ro'yxati (bulk narx filtri uchun) to'ldirib boriladi.
      void registerFacets({ supplier: item.supplier.trim() });
    }
    batch.update(refs[i]!, updates);
  }

  // KIRIM TARIXI: kim, qachon, nimadan qancha kiritgani yozib boriladi.
  const intakeRef = db.collection("stockIntakes").doc();
  const intake: StockIntake = {
    id: intakeRef.id,
    adminUid: admin.uid,
    adminEmail: admin.email ?? null,
    adminName: admin.displayName ?? admin.email ?? null,
    source: "panel",
    kind: "restock",
    items: parsed.data.items.map((item, i) => {
      const data = snaps[i]?.data() as { name?: string; stock?: number; unit?: string } | undefined;
      return {
        productId: item.productId,
        name: data?.name ?? item.productId,
        unit: data?.unit ?? "dona",
        qty: item.qty,
        stockBefore: data?.stock ?? 0,
        price: item.price ?? null,
        supplier: item.supplier?.trim() || null,
      };
    }),
    totalQty: parsed.data.items.reduce((sum, item) => sum + item.qty, 0),
    createdAt: now,
  };
  batch.set(intakeRef, intake);

  try {
    await batch.commit();
    await announceIntake(refs, snaps);
    await logAction(`📥 Kirim (${admin.email ?? "admin"}): ${parsed.data.items.length} ta mahsulot zaxirasi yangilandi`);
    return NextResponse.json({ ok: true, updated: parsed.data.items.length });
  } catch (error) {
    console.error("Kirimni saqlashda xato:", error);
    return NextResponse.json({ error: "Kirimni saqlashda xatolik yuz berdi." }, { status: 500 });
  }
}
